import { documentReissue } from './document-reissue'
import { contentKinds, contentCommand, contentOriginal } from './pandadoc-content'
import { Buffer } from 'node:buffer'
import { randomUUID } from 'node:crypto'
import { planD1Import, createD1ImportJob, applyD1ImportBatches, undoD1Import, readD1ImportJob, readD1ImportOriginals,
 canonicalJson, sha256, d1RequestContext, type D1ImportContext, type ImportMapping } from '../../modules/import-kit/src/d1/index.ts'
import { documentSource, documentNamespace, type UploadedDocument } from './document-source'
import { documentDestination, documentTargets } from './document-targets'
import { fail, requiredText } from './errors'
import type { Actor } from './index'

const ownerSql = "EXISTS(SELECT 1 FROM oa_operators WHERE id=? AND role='owner' AND status='active')"
export async function documentOwner(db: D1Database, actor: Actor) {
 if (actor.role!=='owner' || !await db.prepare('SELECT 1 WHERE '+ownerSql).bind(actor.id).first()) fail('owner_required',403)
}
const context=(db:D1Database,actor:Actor):D1ImportContext=>d1RequestContext({
 destination:documentDestination,namespace:documentNamespace,mappingVersion:'exported-documents-v1',
 storage:{database:db,targets:documentTargets},batchSize:5,maxBatches:1,
 authorization:{principalId:actor.id,predicate:()=>({sql:ownerSql,params:[actor.id]})},
})
const mapping:ImportMapping={version:'exported-documents-v1',map(record){
 const payload=record.payload as any
 return {effects:[{targetKind:record.kind,targetId:record.sourceId,value:payload.value}]}
}}
async function session(db:D1Database,actor:Actor,id:unknown) {
 await documentOwner(db,actor)
 const row=await db.prepare('SELECT * FROM p_document_moveins WHERE id=? AND owner_id=?').bind(requiredText(id,'id'),actor.id).first<any>()
 if (!row) fail('import_job_not_found',404)
 return row
}
const assertion=(db:D1Database,actor:Actor,id:string)=>db.prepare("INSERT INTO ik_d1_assertions(ok) SELECT CASE WHEN "+ownerSql+" AND EXISTS(SELECT 1 FROM p_document_moveins WHERE id=? AND owner_id=? AND fingerprint IS NULL) THEN 1 ELSE 0 END").bind(actor.id,id,actor.id)
async function uploaded(db:D1Database,id:string):Promise<UploadedDocument[]> {
 const uploads=(await db.prepare('SELECT * FROM p_document_uploads WHERE movein_id=? ORDER BY sha256').bind(id).all<any>()).results
 if (!uploads.length || uploads.some(u=>!u.complete)) fail('incomplete_upload',409,'Finish or resume every upload before previewing')
 return Promise.all(uploads.map(async u=>{
  const chunks=(await db.prepare('SELECT base64 FROM p_document_upload_chunks WHERE movein_id=? AND sha256=? ORDER BY position').bind(id,u.sha256).all<{base64:string}>()).results
  const bytes=Buffer.concat(chunks.map(c=>Buffer.from(c.base64,'base64')))
  if (bytes.length!==u.size || sha256(bytes)!==u.sha256) fail('upload_hash_mismatch',409,'Upload bytes do not match their SHA-256; upload the original file again')
  return {filename:u.filename,sha256:u.sha256,bytes}
 }))
}
function choices(input:Record<string,unknown>) {
 let value:unknown=input.choices??Object.fromEntries(Object.entries(input).filter(([key,v])=>key.startsWith('match:')&&v).map(([key,v])=>[key.slice(6),v]))
 if (typeof value==='string') { try {value=JSON.parse(value)} catch {fail('invalid_report_choice',400,'Use the reviewed report choices')} }
 if (!value || typeof value!=='object' || Array.isArray(value) || Object.values(value).some(v=>typeof v!=='string')) fail('invalid_report_choice',400)
 return value as Record<string,string>
}
export async function documentImportCommand(db:D1Database,actor:Actor,name:string,input:Record<string,unknown>) {
 await documentOwner(db,actor)
 try {
  if (name==='document-import.create') {
   const id=randomUUID(),label=String(input.label??'Document move-in').trim(),kind=String(input.contentKind??input.kind??'documents')
   if (!label || label.length>150) fail('invalid_input',400,'Name the move-in in 150 characters or fewer')
   await db.batch([db.prepare('INSERT INTO ik_d1_assertions(ok) SELECT CASE WHEN '+ownerSql+' THEN 1 ELSE 0 END').bind(actor.id),
    db.prepare('INSERT INTO p_document_moveins(id,owner_id,label,kind) VALUES(?,?,?,?)').bind(id,actor.id,label,[...contentKinds,'pandadoc-documents'].includes(kind)?kind:'documents')])
   return {id}
  }
  const movein=await session(db,actor,input.id),id=movein.id
  if (name==='document-import.upload-start') {
   if (movein.fingerprint) fail('import_frozen',409,'This reviewed move-in is frozen. Start another move-in for additional files')
   const hash=String(input.sha256),size=Number(input.size),filename=String(input.filename)
   if (!/^[a-f0-9]{64}$/.test(hash)||!Number.isSafeInteger(size)||size<1||size>5*1024*1024||filename.length>200||!/^([^/\\\x00-\x1f]+)\.(zip|pdf|csv|docx)$/i.test(filename)) fail('invalid_upload',400,'Choose a ZIP, PDF, Word document or report CSV up to 5 MiB')
   const prior=await db.prepare('SELECT * FROM p_document_uploads WHERE movein_id=? AND sha256=?').bind(id,hash).first<any>()
   if (prior) { if(prior.size!==size)fail('upload_conflict',409);return {sha256:hash,received:prior.received,complete:Boolean(prior.complete)} }
   const total=await db.prepare('SELECT COALESCE(SUM(size),0) AS bytes,COUNT(*) AS count FROM p_document_uploads WHERE movein_id=?').bind(id).first<any>()
   if(total.bytes+size>20*1024*1024||total.count>=30)fail('upload_limit',413,'Use up to 30 files and 20 MiB per move-in')
   await db.batch([assertion(db,actor,id),db.prepare('INSERT INTO p_document_uploads(movein_id,sha256,filename,size) VALUES(?,?,?,?)').bind(id,hash,filename,size)])
   return {sha256:hash,received:0,complete:false}
  }
  if (name==='document-import.upload-chunk') {
   if (movein.fingerprint) fail('import_frozen',409)
   const hash=String(input.sha256),position=Number(input.position),base64=String(input.base64),bytes=Buffer.from(base64,'base64')
   if(!Number.isSafeInteger(position)||position<0||!bytes.length||bytes.length>48000||bytes.toString('base64')!==base64)fail('invalid_chunk',400,'Upload an exact file chunk of up to 48,000 bytes')
   const upload=await db.prepare('SELECT * FROM p_document_uploads WHERE movein_id=? AND sha256=?').bind(id,hash).first<any>()
   if(!upload)fail('upload_not_found',404)
   if(position<upload.received){
    const prior=await db.prepare('SELECT base64 FROM p_document_upload_chunks WHERE movein_id=? AND sha256=? AND position=?').bind(id,hash,position).first<any>()
    if(prior?.base64!==base64)fail('upload_conflict',409,'The repeated chunk differs from the original bytes')
    return {received:upload.received,complete:Boolean(upload.complete)}
   }
   if(position!==upload.received||position+bytes.length>upload.size||upload.complete)fail('upload_conflict',409,'Resume at the recorded byte offset')
   await db.batch([assertion(db,actor,id),
    db.prepare('INSERT INTO ik_d1_assertions(ok) SELECT CASE WHEN EXISTS(SELECT 1 FROM p_document_uploads WHERE movein_id=? AND sha256=? AND received=? AND complete=0) THEN 1 ELSE 0 END').bind(id,hash,position),
    db.prepare('INSERT INTO p_document_upload_chunks(movein_id,sha256,position,base64,size) VALUES(?,?,?,?,?)').bind(id,hash,position,base64,bytes.length),
    db.prepare('UPDATE p_document_uploads SET received=received+? WHERE movein_id=? AND sha256=?').bind(bytes.length,id,hash)])
   return {received:position+bytes.length,complete:false}
  }
  if (name==='document-import.upload-finish') {
   if(movein.fingerprint)fail('import_frozen',409)
   const hash=String(input.sha256),upload=await db.prepare('SELECT * FROM p_document_uploads WHERE movein_id=? AND sha256=?').bind(id,hash).first<any>()
   if(!upload||upload.received!==upload.size)fail('incomplete_upload',409,'Resume the upload from its recorded byte offset')
   const chunks=(await db.prepare('SELECT base64 FROM p_document_upload_chunks WHERE movein_id=? AND sha256=? ORDER BY position').bind(id,hash).all<any>()).results
   if(sha256(Buffer.concat(chunks.map(c=>Buffer.from(c.base64,'base64'))))!==hash)fail('upload_hash_mismatch',409,'Uploaded bytes differ from the declared SHA-256')
   await db.batch([assertion(db,actor,id),db.prepare('UPDATE p_document_uploads SET complete=1 WHERE movein_id=? AND sha256=?').bind(id,hash)])
   return {received:upload.size,complete:true}
  }
  if(contentKinds.includes(movein.kind))return await contentCommand(db,actor,name,input,movein,()=>uploaded(db,id))
  const kit=context(db,actor)
  if(['document-import.reissue-preview','document-import.reissue'].includes(name)){if(!movein.job_id)fail('import_job_not_found',404);return documentReissue(db,actor,name,input,movein,()=>readD1ImportOriginals(movein.job_id,kit))}
  if (name==='document-import.preview'||name==='document-import.apply') {
   const selected=choices(input)
   if(movein.fingerprint) {
    if(name==='document-import.preview'||input.fingerprint!==movein.fingerprint||canonicalJson(selected)!==movein.choices_json)fail('review_fingerprint_mismatch',409,'Continue the exact reviewed import from its history')
    if(movein.job_id)return {id,job:await applyD1ImportBatches(movein.job_id,kit),report:JSON.parse(movein.report_json)}
   }
   const prepared=await documentSource(await uploaded(db,id),selected,id,movein.kind==='pandadoc-documents'?actor.id:undefined)
   const plan=await planD1Import(prepared.source,mapping,kit)
   // A second import never replaces an already retained original or its attribution.
   const prior=await db.prepare('SELECT id FROM ik_jobs WHERE destination=? AND principal_id=? AND operation_key=?').bind(documentDestination,actor.id,id).first<any>()
   const existing:string[]=[]
   if(!prior)for(const p of prepared.documents)if(await db.prepare('SELECT 1 FROM p_imported_documents WHERE id=?').bind(p.id).first())existing.push(p.id)
   if(existing.length) {
    prepared.report.held+=existing.length
    prepared.report.arrived-=prepared.documents.filter(p=>existing.includes(p.id)&&p.signatureEvidence.length).length
   }
   const canApply=prepared.canApply&&existing.length===0
   if(name==='document-import.preview')return {id,kind:'Document move-in',fingerprint:plan.fingerprint,...prepared,source:undefined,canApply,choices:selected,existing}
   if(input.fingerprint!==plan.fingerprint)fail('review_fingerprint_mismatch',409,'Preview the exact uploaded bytes and report choices again')
   if(!canApply)fail('document_import_needs_review',409,'Resolve ambiguous report matches and existing-document conflicts before applying')
   await db.batch([db.prepare('INSERT INTO ik_d1_assertions(ok) SELECT CASE WHEN '+ownerSql+' AND EXISTS(SELECT 1 FROM p_document_moveins WHERE id=? AND (fingerprint IS NULL OR fingerprint=?)) THEN 1 ELSE 0 END').bind(actor.id,id,plan.fingerprint),
    db.prepare('UPDATE p_document_moveins SET fingerprint=?,choices_json=?,report_json=? WHERE id=?').bind(plan.fingerprint,canonicalJson(selected),canonicalJson(prepared.report),id)])
   const job=await createD1ImportJob(plan,{...kit,reviewedFingerprint:plan.fingerprint,operationKey:id})
   await db.prepare('UPDATE p_document_moveins SET job_id=? WHERE id=? AND fingerprint=?').bind(job.id,id,plan.fingerprint).run()
   return {id,job:await applyD1ImportBatches(job.id,kit),report:prepared.report}
  }
  if(!movein.job_id)fail('import_job_not_found',404)
  if(name==='document-import.continue')return {id,job:await applyD1ImportBatches(movein.job_id,kit)}
  if(name==='document-import.undo'){
   if(await db.prepare("SELECT 1 FROM p_imported_document_links l JOIN p_imported_documents d ON d.id=l.document_id WHERE json_extract(d.data_json,'$.moveinId')=? UNION ALL SELECT 1 FROM p_proposal_filing f JOIN p_proposal_folders d ON d.id=f.folder_id WHERE d.movein_id=?").bind(id,id).first())fail('import_dependency',409,'A new draft or filed proposal uses this move-in. Its originals and folders are preserved.')
   return {id,job:await undoD1Import(movein.job_id,kit)}
  }
  if(name==='document-import.journal'){
   const job=await readD1ImportJob(movein.job_id,kit),originals=await readD1ImportOriginals(job.id,kit)
   const provenance=(await db.prepare('SELECT record_json FROM ik_provenance WHERE job_id=? ORDER BY ordinal,effect_ordinal').bind(job.id).all<{record_json:string}>()).results.map(r=>JSON.parse(r.record_json))
   const reissues=(await db.prepare("SELECT r.* FROM p_document_reissues r JOIN p_imported_documents d ON d.id=r.document_id WHERE json_extract(d.data_json,'$.moveinId')=?").bind(id).all()).results
   return {id,job,originals,provenance,reissues,report:JSON.parse(movein.report_json)}
  }
  fail('unknown_import_command',400)
 }catch(error){
  if(error&&typeof error==='object'&&'status' in error)throw error
  const message=error instanceof Error?error.message:''
  if(/CONFLICT|GUARD|UNIQUE constraint|FOREIGN KEY constraint|CHECK constraint/.test(message))fail('import_conflict',409,'The import conflicts with current records or authority. Later changes and dependent proposals are preserved.')
  if(/IMPORT_PLAN_TOO_LARGE|IMPORT_D1_.*LIMIT/.test(message))fail('import_limit',413,'This move-in exceeds the reviewed import limit. Use smaller files or fewer documents in a separate move-in.')
  throw error
 }
}
export async function documentMoveinState(db:D1Database,actor:Actor) {
 if(actor.role!=='owner')return {documentMoveins:[],importedDocuments:[]}
 await documentOwner(db,actor)
 const moves=(await db.prepare('SELECT m.*,j.state,j.checkpoint,j.total FROM p_document_moveins m LEFT JOIN ik_jobs j ON j.id=m.job_id WHERE owner_id=? ORDER BY m.rowid DESC').bind(actor.id).all<any>()).results
 for(const move of moves){if(contentKinds.includes(move.kind)&&move.fingerprint){const status=await db.prepare('SELECT undone FROM p_pandadoc_moves WHERE id=?').bind(move.id).first<any>();move.state=status?.undone?'undone':'completed'}move.uploads=(await db.prepare('SELECT sha256,filename,size,received,complete FROM p_document_uploads WHERE movein_id=? ORDER BY rowid').bind(move.id).all()).results}
 const documents=(await db.prepare("SELECT d.data_json,r.proposal_id AS new_draft_id FROM p_imported_documents d LEFT JOIN p_document_reissues r ON r.document_id=d.id JOIN p_document_moveins m ON m.id=json_extract(d.data_json,'$.moveinId') WHERE m.owner_id=? ORDER BY d.id").bind(actor.id).all<{data_json:string;new_draft_id?:string}>()).results.map(r=>({...JSON.parse(r.data_json),...(r.new_draft_id?{newDraftId:r.new_draft_id}:{})}))
 return {documentMoveins:moves,importedDocuments:documents}
}
export async function importedOriginal(db:D1Database,actor:Actor,query:URLSearchParams) {
 await documentOwner(db,actor)
 let bytes:Buffer,filename='import-original'
 if(query.has('document')){
  const row=await db.prepare('SELECT data_json FROM p_imported_documents WHERE id=?').bind(query.get('document')).first<any>()
  if(!row)fail('original_not_found',404)
  const data=JSON.parse(row.data_json)
  // Original bytes live once in the import kit's chunked, integrity-checked custody.
  const journal=await documentImportCommand(db,actor,'document-import.journal',{id:data.moveinId}) as any
  const file=journal.originals.find((o:any)=>o.name==='documents/'+data.sha256+'.pdf')
  if(file?.original.status!=='retained')fail('original_not_found',404)
  bytes=Buffer.from(file.original.base64,'base64')
  if(sha256(bytes)!==data.sha256)fail('original_integrity',409,'Original file integrity check failed')
  filename='retained-document.pdf'
 }else{
  const move=await session(db,actor,query.get('id'))
  if(contentKinds.includes(move.kind)){const response=await contentOriginal(db,move,String(query.get('name')));await documentOwner(db,actor);return response}
  const journal=await documentImportCommand(db,actor,'document-import.journal',{id:query.get('id')}) as any
  const file=journal.originals.find((o:any)=>o.name===query.get('name'))
  if(file?.original.status!=='retained')fail('original_not_found',404)
  bytes=Buffer.from(file.original.base64,'base64')
 }
 await documentOwner(db,actor)
 return new Response(new Uint8Array(bytes),{headers:{'content-type':query.has('document')?'application/pdf':'application/octet-stream','content-disposition':'attachment; filename="'+filename+'"','cache-control':'no-store','x-content-type-options':'nosniff'}})
}
