import { Buffer } from 'node:buffer'
import { canonicalJson, sha256 } from '../../modules/import-kit/src/d1/index.ts'
import { businessSource } from './business-source'
import { wordContent } from '../documents/import-export'
import { proposalDocument } from '../documents/blocks'
import { pricedOptions } from '../pricing'
import { variableNames } from '../variables'
import { prepareAttachment, downloadAttachment } from '../attachments'
import { fail } from './errors'
import type { UploadedDocument } from './document-source'
import type { Actor } from './index'
import { PDFDocument } from 'pdf-lib'

export const contentKinds=['pandadoc-template','pandadoc-library']
const ownerSql="EXISTS(SELECT 1 FROM oa_operators WHERE id=? AND role='owner' AND status='active')"
const stable=(hash:string,label:string)=>'pd_'+sha256(hash+':'+label).slice(0,48)
const note='Roles, signing order, assigned recipients and fields are not reconstructed from a Word download. No URL images are acquired. Bulk PDF retention and reviewed new drafts use the exported-document move-in. Provider enrichment and complete migration qualification remain unavailable.'

/** Preview is pure: uploaded bytes, catalog matches and source claims all bind the explicit apply. */
async function prepare(db:D1Database,move:any,uploads:UploadedDocument[],actor:Actor,input:Record<string,unknown>){
 const mode=move.kind,files:any[]=[],outputs:any[]=[],unmapped:string[]=[],sources:any[]=[],skipped:string[]=[]
 let companyIds=input.companyIds??{}
 if(typeof companyIds==='string'){try{companyIds=JSON.parse(companyIds)}catch{fail('invalid_mapping',400,'Review the company ID mapping')}}
 const catalog=[...(await db.prepare('SELECT id,sku,name FROM p_priced_catalog').all<any>()).results,...(await db.prepare('SELECT id,data_json FROM p_catalog_items').all<any>()).results.map(r=>({id:r.id,...JSON.parse(r.data_json)}))]
 // CSV records are reviewed with the Word outputs, so SKU links bind the same original bytes.
 for(const upload of uploads.filter(u=>/\.csv$/i.test(u.filename))){
  const csv=Buffer.from(upload.bytes).toString('utf8'),kind=/^Name,SKU,/i.test(csv)?'catalog':'contacts',claimMode='pandadoc-'+kind
  if(await db.prepare('SELECT 1 FROM p_pandadoc_sources WHERE sha256=? AND mode=?').bind(upload.sha256,claimMode).first()){skipped.push(upload.filename);continue}
  const prepared=businessSource({kind,format:'pandadoc',csv,...(kind==='contacts'?{mapping:{companyIds}}:{})},{allowUnfetched:input.omitUnfetchedImages===true||input.omitUnfetchedImages==='yes'})
  const errors=prepared.source.diagnostics?.filter(d=>d.severity==='error')??[]
  if(errors.length)fail('business_import_needs_review',409,errors.map(d=>d.message).join('; '))
  unmapped.push(...(prepared.source.diagnostics??[]).filter(d=>d.severity!=='error').map(d=>upload.filename+': '+d.message))
  const sourceId=stable(upload.sha256,claimMode+':source'),source={filename:upload.filename,sha256:upload.sha256,fileId:sourceId,mode:claimMode,outputIds:[] as string[]}
  files.push({id:sourceId,filename:upload.filename,mediaType:'text/csv',size:upload.bytes.length,sha256:upload.sha256,base64:Buffer.from(upload.bytes).toString('base64')});sources.push(source)
  for(const record of prepared.source.records){
   const value={...(record.payload as any).value,version:1},table=businessTables[record.kind]
   if(!table||await db.prepare('SELECT 1 FROM '+table+' WHERE id=?').bind(value.id).first())fail('existing_business_record',409,'A source record already exists; existing records are never replaced')
   outputs.push({kind:record.kind,id:value.id,title:value.name??[value.first_name,value.last_name].filter(Boolean).join(' '),value,media:[]})
   source.outputIds.push(value.id)
   if(record.kind==='catalog')catalog.push(value)
  }
 }
 for(const upload of uploads.filter(u=>! /\.csv$/i.test(u.filename))){
  if(await db.prepare('SELECT 1 FROM p_pandadoc_sources WHERE sha256=? AND mode=?').bind(upload.sha256,mode).first()){skipped.push(upload.filename);continue}
  if(!/\.(docx|pdf)$/i.test(upload.filename))fail('invalid_upload',400,'Choose exported Word documents or fixed PDF templates')
  if(mode==='pandadoc-library'&&!/\.docx$/i.test(upload.filename))fail('word_required',400,'Library sections need a Word download with Heading 1 sections')
  const title=upload.filename.replace(/\.(docx|pdf)$/i,''),sourceId=stable(upload.sha256,mode+':source')
  const retain=async(filename:string,mediaType:string,bytes:Uint8Array)=>{
   const id=stable(upload.sha256,mode+':media:'+files.length)
   files.push({id,filename,mediaType,size:bytes.length,sha256:sha256(bytes),base64:Buffer.from(bytes).toString('base64')});return id
  }
  files.push({id:sourceId,filename:upload.filename,mediaType:/\.pdf$/i.test(upload.filename)?'application/pdf':'application/vnd.openxmlformats-officedocument.wordprocessingml.document',size:upload.bytes.length,sha256:upload.sha256,base64:Buffer.from(upload.bytes).toString('base64')})
  const source={filename:upload.filename,sha256:upload.sha256,fileId:sourceId,outputIds:[] as string[]};sources.push(source)
  const optionId='imported',tables:any[]=[];let sequence=0,document:any,report={unknown:[] as string[],unmatched:[] as string[],missing:[] as string[]}
  if(/\.pdf$/i.test(upload.filename)){
   let pdf;try{pdf=await PDFDocument.load(upload.bytes)}catch{fail('invalid_pdf',400,'Upload a readable, unencrypted PDF')}
   if(!pdf.getPageCount()||pdf.getPageCount()>100)fail('invalid_pdf',400,'Use between 1 and 100 fixed pages')
   document={version:1,blocks:[],fixedPdf:{fileId:sourceId,pages:pdf.getPageCount()}}
   report.missing.push('Word download needed for editing')
  }else{
   const converted=await wordContent(upload.bytes,catalog,optionId,tables,retain,()=>stable(upload.sha256,'block:'+sequence++));report=converted.report
   document={version:1,blocks:converted.parts}
  }
  unmapped.push(...report.unknown.map(t=>upload.filename+': unknown token '+t),...report.unmatched.map(t=>upload.filename+': unmatched quote row '+t),...report.missing.map(t=>upload.filename+': '+t))
  const media=files.filter(f=>f.id!==sourceId&&document.blocks.some((b:any)=>b.assetId===f.id)).map(f=>f.id)
  if(document.fixedPdf)media.push(sourceId)
  if(mode==='pandadoc-library'){
   const sections:{title:string;blocks:any[]}[]=[]
   for(const block of document.blocks){if(block.type==='heading'&&block.headingLevel===1)sections.push({title:block.title,blocks:[]});if(sections.length)sections.at(-1)!.blocks.push(block);else unmapped.push(upload.filename+': content before the first Heading 1')}
   if(!sections.length)fail('heading_required',400,'Library import needs Heading 1 sections')
   for(const [index,section]of sections.entries()){
    const content=section.blocks.map(b=>[b.title,b.text].filter(Boolean).join('\n')).join('\n\n')
    if(content.length>10000||section.title.length>200)fail('content_limit',400,'Each library section needs a title up to 200 characters and content up to 10000 characters')
    const id=stable(upload.sha256,mode+':'+index),doc=proposalDocument({version:1,blocks:section.blocks})
    const rich=section.blocks.some(b=>['image','pricing','table'].includes(b.type))
    outputs.push({kind:'library',id,title:section.title,content,document:rich?doc:null,tables:rich?tables:[],media:section.blocks.filter(b=>b.type==='image').map(b=>b.assetId)})
    source.outputIds.push(id)
   }
  }else{
   // A content-only Word or fixed PDF has no source price. Starting it requires an explicit new price.
   const options=tables.length?pricedOptions([{id:optionId,label:'Imported quote',cents:1}],tables):[]
   const merge=variableNames(document).length?{patterns:{},values:{}}:undefined
   document=proposalDocument({...document,importReport:report,...(merge?{merge}:{})},options)
   const id=stable(upload.sha256,mode),snapshot={importedContent:true,title,scope:'',terms:'',deposit_bps:0,options,document,currency:'USD',recipient_plan:[]}
   outputs.push({kind:'template',id,name:title,snapshot,media,fixed:Boolean(document.fixedPdf),needsPrice:options.length===0})
   source.outputIds.push(id)
  }
 }
 const report={arrived:outputs.length,held:0,unmapped:unmapped.length,duplicateDocuments:skipped.length,unmappedItems:unmapped,rows:[],notes:[note],skipped,sources,outputs:outputs.map(o=>({id:o.id,kind:o.kind,title:o.name??o.title,fixed:o.fixed??false,needsPrice:o.needsPrice??false,blocks:o.snapshot?.document.blocks??[],options:o.snapshot?.options??[]}))}
 const fingerprint=sha256(canonicalJson({mode,uploads:uploads.map(u=>({filename:u.filename,sha256:u.sha256})),files,outputs,report,owner:actor.id,companyIds,omitUnfetchedImages:input.omitUnfetchedImages===true||input.omitUnfetchedImages==='yes'}))
 return {fingerprint,files,outputs,sources,report,uploadRows:uploads.map(u=>({sha256:u.sha256,filename:u.filename,size:u.bytes.length})),canApply:outputs.length>0,kind:'PandaDoc content',id:move.id,companyIds,omitUnfetchedImages:input.omitUnfetchedImages===true||input.omitUnfetchedImages==='yes'}
}
const businessTables:Record<string,string>={companies:'p_companies',contacts:'p_contacts',catalog:'p_catalog_items'}
const expectedBusiness=(o:any)=>({id:o.id,data_json:canonicalJson(o.value),version:1,...(o.kind==='contacts'?{company_id:o.value.company_id}:{} )})
const expectedTemplate=(o:any,owner:string)=>({id:o.id,owner_id:owner,name:o.name,version:1,snapshot:canonicalJson(o.snapshot),pdf_enabled:1,expiry:'{"mode":"never","period_days":null,"expires_on":null,"time_zone":"UTC","warning_days":null}',suggestion_sections:'[]',created_at:o.importedAt,updated_at:o.importedAt,shared:0,folder_id:null,delivery_sources:'{"reminders":"inherit","expiry":"inherit","warning":"inherit"}'})
const expectedLibrary=(o:any,owner:string)=>({id:o.id,title:o.title,kind:'section',content:o.content,version:1,updated_by:owner,updated_at:o.importedAt,folder_id:null,rich_kind:null,tags:'[]'})

export async function contentCommand(db:D1Database,actor:Actor,name:string,input:Record<string,unknown>,move:any,uploads:()=>Promise<UploadedDocument[]>){
 const saved=await db.prepare('SELECT * FROM p_pandadoc_moves WHERE id=?').bind(move.id).first<any>()
 if(name==='document-import.preview'){
  if(saved)fail('import_frozen',409,'Inspect the journal for this applied move-in')
  const prepared=await prepare(db,move,await uploads(),actor,input)
  return {...prepared,files:undefined,outputs:undefined,uploadRows:undefined,canApply:prepared.canApply}
 }
 if(name==='document-import.apply'){
  if(saved){if(input.fingerprint!==saved.fingerprint)fail('review_fingerprint_mismatch',409);return journal(saved)}
  const prepared=await prepare(db,move,await uploads(),actor,input)
  if(input.fingerprint!==prepared.fingerprint)fail('review_fingerprint_mismatch',409,'Preview the current source files and catalog matches again')
  if(!prepared.canApply)fail('content_already_imported',409,'These source files have already been imported; no outputs were added')
  const writes:D1PreparedStatement[]=[],importedAt=Date.now()
  for(const output of prepared.outputs)output.importedAt=importedAt
  for(const file of prepared.files){
   const retained=await prepareAttachment(db,{filename:file.filename,mediaType:file.mediaType,bytes:Buffer.from(file.base64,'base64')})
   // Replace generated IDs only in prepared statements by preparing the stable immutable rows here.
   writes.push(db.prepare('INSERT INTO p_attachment_files(id,filename,media_type,size,sha256,created_at) VALUES(?,?,?,?,?,0)').bind(file.id,file.filename,file.mediaType,file.size,file.sha256))
   const bytes=Buffer.from(file.base64,'base64')
   for(let offset=0,part=0;offset<bytes.length;offset+=48*1024,part++)writes.push(db.prepare('INSERT INTO p_attachment_chunks(file_id,part,bytes_base64) VALUES(?,?,?)').bind(file.id,part,bytes.subarray(offset,offset+48*1024).toString('base64')))
   if(retained.attachment.sha256!==file.sha256)fail('original_integrity',409)
  }
  for(const output of prepared.outputs){
   const row=businessTables[output.kind]?expectedBusiness(output):output.kind==='template'?expectedTemplate(output,actor.id):expectedLibrary(output,actor.id),table=businessTables[output.kind]??(output.kind==='template'?'p_personal_templates':'p_library_items')
   const columns=Object.keys(row);writes.push(db.prepare('INSERT INTO '+table+'('+columns.join(',')+') VALUES('+columns.map(()=>'?').join(',')+')').bind(...Object.values(row)))
   if(output.document)writes.push(db.prepare('INSERT INTO p_imported_library(item_id,document,options) VALUES(?,?,?)').bind(output.id,canonicalJson(output.document),canonicalJson(output.tables)))
   for(const file of output.media)writes.push(db.prepare('INSERT INTO '+(output.kind==='template'?'p_template_document_media(template_id':'p_library_media(item_id')+',file_id) VALUES(?,?)').bind(output.id,file))
  }
  await db.batch([db.prepare('INSERT INTO ik_d1_assertions(ok) SELECT CASE WHEN '+ownerSql+' AND NOT EXISTS(SELECT 1 FROM p_pandadoc_moves WHERE id=?) THEN 1 ELSE 0 END').bind(actor.id,move.id),
   db.prepare('INSERT INTO p_pandadoc_moves(id,fingerprint,report_json,outputs_json,sources_json) VALUES(?,?,?,?,?)').bind(move.id,prepared.fingerprint,canonicalJson(prepared.report),canonicalJson(prepared.outputs),canonicalJson(prepared.sources)),
   db.prepare('INSERT INTO ik_d1_assertions(ok) SELECT CASE WHEN (SELECT COUNT(*) FROM p_document_uploads WHERE movein_id=?)=? THEN 1 ELSE 0 END').bind(move.id,prepared.uploadRows.length),
   ...prepared.uploadRows.map(u=>db.prepare('INSERT INTO ik_d1_assertions(ok) SELECT CASE WHEN EXISTS(SELECT 1 FROM p_document_uploads WHERE movein_id=? AND sha256=? AND filename=? AND size=? AND complete=1) THEN 1 ELSE 0 END').bind(move.id,u.sha256,u.filename,u.size)),
   ...prepared.sources.map(s=>db.prepare('INSERT INTO p_pandadoc_sources(sha256,mode,movein_id) VALUES(?,?,?)').bind(s.sha256,s.mode??move.kind,move.id)),...writes,
   db.prepare('UPDATE p_document_moveins SET fingerprint=?,report_json=? WHERE id=?').bind(prepared.fingerprint,canonicalJson(prepared.report),move.id)])
  return journal(await db.prepare('SELECT * FROM p_pandadoc_moves WHERE id=?').bind(move.id).first())
 }
 if(!saved)fail('import_job_not_found',404)
 if(name==='document-import.journal')return journal(saved)
 if(name==='document-import.undo'){
  if(saved.undone)return journal(saved)
  const outputs=JSON.parse(saved.outputs_json),writes:D1PreparedStatement[]=[]
  for(const output of [...outputs].reverse()){
   const expected=businessTables[output.kind]?expectedBusiness(output):output.kind==='template'?expectedTemplate(output,actor.id):expectedLibrary(output,actor.id),table=businessTables[output.kind]??(output.kind==='template'?'p_personal_templates':'p_library_items'),columns=Object.keys(expected)
   const dependencies=output.kind==='template'?'NOT EXISTS(SELECT 1 FROM p_template_sources WHERE template_id=?)':output.kind==='library'?'NOT EXISTS(SELECT 1 FROM p_library_uses WHERE item_id=?)':output.kind==='catalog'?'NOT EXISTS(SELECT 1 FROM p_priced_catalog WHERE source_id=?)':'? IS NOT NULL'
   writes.push(db.prepare('INSERT INTO ik_d1_assertions(ok) SELECT CASE WHEN EXISTS(SELECT 1 FROM '+table+' WHERE '+columns.map(c=>c+' IS ?').join(' AND ')+') AND '+dependencies+' THEN 1 ELSE 0 END').bind(...Object.values(expected),output.id))
   if(output.kind==='catalog')writes.push(db.prepare("INSERT INTO ik_d1_assertions(ok) SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM p_proposals,json_tree(p_proposals.options) j WHERE j.key='catalogId' AND j.value=?) AND NOT EXISTS(SELECT 1 FROM p_imported_library,json_tree(p_imported_library.options) j WHERE j.key='catalogId' AND j.value=?) AND NOT EXISTS(SELECT 1 FROM p_personal_templates,json_tree(p_personal_templates.snapshot) j WHERE j.key='catalogId' AND j.value=? AND p_personal_templates.id NOT IN ("+outputs.filter((o:any)=>o.kind==='template').map(()=>'?').join(',')+")) THEN 1 ELSE 0 END").bind(output.id,output.id,output.id,...outputs.filter((o:any)=>o.kind==='template').map((o:any)=>o.id)))
   if(output.kind==='template'||output.kind==='library')writes.push(db.prepare('DELETE FROM '+(output.kind==='template'?'p_template_document_media WHERE template_id=?':'p_library_media WHERE item_id=?')).bind(output.id))
   if(output.kind==='library')writes.push(db.prepare('DELETE FROM p_imported_library WHERE item_id=?').bind(output.id))
   writes.push(db.prepare('DELETE FROM '+table+' WHERE id=?').bind(output.id))
  }
  await db.batch([db.prepare('INSERT INTO ik_d1_assertions(ok) SELECT CASE WHEN '+ownerSql+' THEN 1 ELSE 0 END').bind(actor.id),...writes,db.prepare('UPDATE p_pandadoc_moves SET undone=1 WHERE id=?').bind(move.id)])
  return journal({...saved,undone:1})
 }
 fail('unknown_import_command',400)
}
function journal(saved:any){return {id:saved.id,kind:'PandaDoc content',fingerprint:saved.fingerprint,job:{state:saved.undone?'undone':'completed'},report:JSON.parse(saved.report_json),outputs:JSON.parse(saved.outputs_json),sources:JSON.parse(saved.sources_json),undone:Boolean(saved.undone)}}
export async function contentOriginal(db:D1Database,move:any,name:string){
 const row=await db.prepare('SELECT sources_json FROM p_pandadoc_moves WHERE id=?').bind(move.id).first<any>()
 const source=row&&JSON.parse(row.sources_json).find((s:any)=>s.sha256===name)
 if(!source)fail('original_not_found',404)
 const file=await db.prepare('SELECT * FROM p_attachment_files WHERE id=?').bind(source.fileId).first<any>()
 if(!file||file.sha256!==source.sha256)fail('original_integrity',409)
 return downloadAttachment(db,{id:file.id,filename:file.filename,mediaType:file.media_type,size:file.size,sha256:file.sha256})
}
