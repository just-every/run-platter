import { PDFDocument } from 'pdf-lib'
import { copyAttachments, downloadAttachment, prepareAttachment, type AttachmentRef } from '../attachments'
import { commit, exact, need, snapshot, type Actor } from '../model'
import { permitted } from '../permissions'
import { negotiatedView, pendingNegotiation } from '../negotiation'
import { documentOf, type ProposalDocument } from './blocks'
export const documentMediaIds=(document:ProposalDocument)=>[...new Set([document.brand?.logoId,...document.blocks.flatMap(b=>[b.assetId,b.posterId])].filter((v):v is string=>Boolean(v)))]
export const copyDocumentMedia=(db:D1Database,source:string,destination:string,document:ProposalDocument)=>{const ids=documentMediaIds(document);return db.prepare('INSERT INTO p_document_media(proposal_id,file_id) SELECT ?,file_id FROM p_document_media WHERE proposal_id=? AND file_id IN ('+(ids.map(()=>'?').join(',')||'NULL')+')').bind(destination,source,...ids)}
export async function mediaFiles(db:D1Database,id:string){return (await db.prepare('SELECT f.id,f.filename,f.media_type AS mediaType,f.size,f.sha256 FROM p_attachment_files f JOIN p_document_media m ON m.file_id=f.id WHERE m.proposal_id=? ORDER BY f.created_at,f.id').bind(id).all<AttachmentRef>()).results}
export async function validateDocumentMedia(db:D1Database,document:ProposalDocument,id?:string){
 const files=id?await mediaFiles(db,id):[]
 const image=(file?:AttachmentRef)=>Boolean(file&&['image/png','image/jpeg'].includes(file.mediaType))
 for(const block of document.blocks){if(block.type==='image')need(image(files.find(f=>f.id===block.assetId)),'Choose an uploaded PNG or JPEG from this proposal');if(block.type==='video'){need(files.some(f=>f.id===block.assetId&&['video/mp4','video/webm'].includes(f.mediaType)),'Choose an uploaded MP4 or WebM from this proposal');need(image(files.find(f=>f.id===block.posterId)),'Choose an uploaded video poster from this proposal')}}
 if(document.brand?.logoId)need(image(files.find(f=>f.id===document.brand?.logoId)),'Choose a logo uploaded to this proposal')
}
/** Explicitly consented display media has a separate namespace. Attachments remain download-only. */
export async function uploadDocumentMedia(db:D1Database,a:Actor,data:FormData){
 const original=await permitted(db,a,data.get('id'),'edit');exact(original,{version:data.get('version')})
 const row=negotiatedView(original,await pendingNegotiation(db,original.id));need(['draft','approved'].includes(row.status),'Upload media to an unsent revision',409)
 need(data.get('consent')==='yes','Confirm this file may be displayed to this proposal’s recipients')
 const file=data.get('file');need(file instanceof File,'Choose an image or video')
 const type=file.type.toLowerCase();need(['image/png','image/jpeg','video/mp4','video/webm'].includes(type),'Upload a PNG, JPEG, MP4 or WebM')
 need(file.size>0&&file.size<=(type.startsWith('image/')?5:20)*1024*1024,'Images are limited to 5 MiB; videos to 20 MiB',413)
 const bytes=new Uint8Array(await file.arrayBuffer())
 if(type.startsWith('image/')){
  if(type==='image/png'){
   need(bytes.length>=24&&[137,80,78,71,13,10,26,10].every((n,i)=>bytes[i]===n),'The file is not a PNG')
   const view=new DataView(bytes.buffer),width=view.getUint32(16),height=view.getUint32(20);need(width>0&&height>0&&width*height<=16_000_000,'Images must be at most 16 megapixels')
  }else need(bytes[0]===255&&bytes[1]===216&&bytes[2]===255,'The file is not a JPEG')
  try{const pdf=await PDFDocument.create(),image=type==='image/png'?await pdf.embedPng(bytes):await pdf.embedJpg(bytes);need(image.width>0&&image.height>0&&image.width*image.height<=16_000_000,'Images must be at most 16 megapixels')}catch(error){need(false,(error as any)?.status?(error as Error).message:'The image cannot be decoded')}
 }else if(type==='video/mp4')need(bytes.length>=12&&String.fromCharCode(...bytes.subarray(4,8))==='ftyp','The file is not an MP4')
 else need(bytes.length>=4&&[26,69,223,163].every((n,i)=>bytes[i]===n),'The file is not a WebM')
 const prepared=await prepareAttachment(db,{filename:file.name,mediaType:type,bytes})
 await commit(db,a,[...prepared.writes,db.prepare('INSERT INTO p_document_media(proposal_id,file_id) VALUES(?,?)').bind(row.id,prepared.attachment.id)],false,{sql:'EXISTS(SELECT 1 FROM p_proposals WHERE id=? AND version=?)',values:[row.id,original.version]})
 return {id:row.id,media:prepared.attachment}
}
export async function documentMedia(db:D1Database,row:any,fileId:string){
 need(documentMediaIds(documentOf(row)).includes(fileId),'Media not present in this document revision',404)
 const file=(await mediaFiles(db,row.id)).find(f=>f.id===fileId);need(file,'Document media not found',404)
 const response=await downloadAttachment(db,file)
 // Only validated media uploaded under explicit inline-display consent reaches here.
 response.headers.set('content-disposition','inline');return response
}
export async function mediaBytes(db:D1Database,row:any,fileId:string){const r=await documentMedia(db,row,fileId);return new Uint8Array(await r.arrayBuffer())}
