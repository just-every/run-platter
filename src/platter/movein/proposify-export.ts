import { Buffer } from 'node:buffer'
import { canonicalJson, sha256, readD1ImportOriginals, type D1ImportContext } from '../../modules/import-kit/src/d1/index.ts'
import { fail } from './errors'
import { prepareAttachment } from '../attachments'
import { documentOf } from '../documents/blocks'
import { commit, exact, need, proposal, snapshot, text, type Actor } from '../model'
import { currentTime } from '../expiry'
import { copyCosts } from '../internal-pricing'
import { independentFixedTemplate } from '../templates'

export const proposifyColumns = {
 title: 'Title', client: 'Client', createdDate: 'Created date', signedDate: 'Signed date',
 status: 'Source status', value: 'Source value', currency: 'Source currency',
} as const
export const proposifyOmissions = [
 'Proposify API import and provider enrichment are not included.',
 'Contact and catalog records use the separate reviewed CSV doors; they are not inferred from report facts.',
 'Open documents need explicit fixed-page reissue into an owner-selected priced draft; billing execution is not continued.',
 'Recipient roles, signing order and fields are not adopted.',
 'URL images are omitted until qualified image egress is available.',
 'Live-provider qualification and scoped delegation are unproved.',
 'Templates remain fixed PDF pages: rebuild in the editor with owner-supplied content and prices.',
]
export type ProposifyColumn = keyof typeof proposifyColumns
export type DocumentReview = { columns: Partial<Record<ProposifyColumn,string>>; templateDocument: string | null }
export function proposifyReview(input: Record<string,unknown>): DocumentReview {
 let columns: any = input.columns ?? Object.fromEntries(Object.keys(proposifyColumns).map(key=>[key,input['column:'+key]??'']))
 if (typeof columns==='string') { try { columns=JSON.parse(columns) } catch { fail('invalid_report_mapping',400) } }
 if (!columns || typeof columns!=='object' || Array.isArray(columns) || Object.keys(columns).some(key=>!Object.hasOwn(proposifyColumns,key)) || Object.values(columns).some(value=>typeof value!=='string'||value.length>200)) fail('invalid_report_mapping',400,'Choose the source column for each report fact')
 const templateDocument = String(input.templateDocument??'') || null
 if (templateDocument&&!/^[a-f0-9]{64}$/.test(templateDocument)) fail('invalid_template_source',400)
 return {columns,templateDocument}
}
export function mappedProposifyReport(headers:string[],cells:string[],review:DocumentReview) {
 const chosen=Object.keys(proposifyColumns).map(key=>review.columns[key as ProposifyColumn])
 if (chosen.some(column=>!column||!headers.includes(column)) || new Set(chosen).size!==chosen.length) return null
 return Object.fromEntries(Object.keys(proposifyColumns).map(key=>[key,cells[headers.indexOf(review.columns[key as ProposifyColumn]!)]??''])) as Record<ProposifyColumn,string>
}

/** Every output binds an original to an explicitly chosen, independently priced draft.
 * Native clients and prices are supplied by the owner; retained report facts grant nothing. */
export async function proposifyTemplateCommand(db:D1Database,actor:Actor,name:string,input:Record<string,unknown>,movein:any,kit:D1ImportContext) {
 if (name==='document-import.template-undo') return undoTemplate(db,actor,input,movein)
 need(movein.provider==='proposify'&&movein.job_id,'Apply a reviewed Proposify move-in first',409)
 if(input.proposalChoice){const [id,version]=String(input.proposalChoice).split(':');input={...input,proposalId:id,version}}
 const outputKind=String(input.outputKind??'template')
 need(['template','reissue','library'].includes(outputKind),'Choose a template, open-document reissue or library section')
 const sourceId=String(input.documentId||JSON.parse(movein.configuration_json).templateDocument||'')
 const review={outputKind,documentId:sourceId,proposalId:String(input.proposalId??''),version:Number(input.version),templateName:typeof input.templateName==='string'?input.templateName.trim():'',consent:input.consent===true||input.consent==='yes'}
 need(Number.isSafeInteger(review.version),'The reviewed draft version is required',409)
 if(name==='document-import.template-apply') {
  const replay=await db.prepare('SELECT * FROM p_proposify_applications WHERE movein_id=? AND fingerprint=?').bind(movein.id,String(input.fingerprint)).first<any>()
  if(replay){need(!replay.reversed_at,'This application was undone; review a new destination',409);need(canonicalJson({...JSON.parse(replay.template_snapshot).review,outputKind:replay.output_kind,documentId:replay.document_id})===canonicalJson(review),'The replay differs from the reviewed destination, prices or choices',409);return {id:movein.id,applicationId:replay.id,proposalId:replay.proposal_id,templateId:replay.template_id,libraryId:replay.library_id,outputKind:replay.output_kind,version:replay.applied_version,revision:replay.applied_revision}}
 }
 const stored=await db.prepare('SELECT * FROM p_imported_documents WHERE id=?').bind(sourceId??'').first<any>()
 need(stored,'Choose a retained source PDF from this move-in',409)
 const source=JSON.parse(stored.data_json)
 need(source.moveinId===movein.id&&source.provider==='proposify'&&!source.signatureEvidence.length,'Signed-source originals remain read-only agreements',409)
 if(outputKind==='template')need(source.disposition==='held-template','Only the separately reviewed template PDF can become a template',409)
 if(outputKind==='reissue')need(source.disposition==='held-open-document'&&source.sourceEvidence&&['draft','sent','viewed','open','pending','not sent'].includes(source.sourceEvidence.status.trim().toLowerCase()),'Choose a report-matched open original; signed or unknown source states stay held',409)
 const state=await db.prepare('SELECT state FROM ik_jobs WHERE id=?').bind(movein.job_id).first<any>()
 need(state?.state==='completed','Finish applying the move-in before using its template',409)
 const row=await proposal(db,input.proposalId)
 exact(row,input)
 need(row.status==='draft'&&row.currency==='USD','Choose an unsent USD draft with owner-supplied prices',409)
 need(!await db.prepare('SELECT 1 FROM p_negotiations WHERE proposal_id=?').bind(row.id).first(),'Choose a draft without a pending negotiation',409)
 need(!await db.prepare('SELECT 1 FROM p_collection_policy WHERE proposal_id=?').bind(row.id).first(),'Turn off collection before applying fixed pages',409)
 need(!await db.prepare('SELECT 1 FROM p_proposal_locks WHERE proposal_id=? UNION ALL SELECT 1 FROM p_proposal_block_locks WHERE proposal_id=?').bind(row.id,row.id).first(),'Use a draft without locked sections',409)
 need(!row.recipient_plan||row.recipient_plan==='[]','Use a single-client draft; no source recipient roles are adopted',409)
 const content=snapshot(row),previous=documentOf(row)
 need(!previous.fixedPdf,'This draft already has fixed pages',409)
 need(content.options.length>0&&content.options.every((option:any)=>option.cents>0),'Price the destination draft before reviewing this template',409)
 const templateName=text(input.templateName,'an output name',150)
 const client=await db.prepare('SELECT * FROM p_clients WHERE id=?').bind(row.client_id).first<any>()
 need(client,'The destination client no longer exists',409)
 need(input.consent===true||input.consent==='yes','Confirm the fixed pages and the destination draft prices')
 const fingerprint=sha256(canonicalJson({movein:movein.id,review:movein.fingerprint,configuration:movein.configuration_json,source:stored.revision,content,client,version:row.version,templateName,outputKind,consent:true}))
 if(name==='document-import.template-preview') return {id:movein.id,kind:'Proposify fixed pages',fingerprint,proposalId:row.id,version:row.version,templateName,outputKind,documentId:sourceId,clientName:client.name,sourceTitle:source.title,sourceSha256:source.sha256,prices:content.options.map((o:any)=>({name:o.label,cents:o.cents})),pages:source.pages}
 need(name==='document-import.template-apply','Unknown fixed-page command',400)
 need(input.fingerprint===fingerprint,'The reviewed bytes, destination, prices or name changed; preview again',409)
 const originals=await readD1ImportOriginals(movein.job_id,kit),file=originals.find(o=>o.name==='documents/'+source.sha256+'.pdf')
 need(file?.original.status==='retained','The source PDF is unavailable',409)
 const bytes=Buffer.from(file.original.base64,'base64')
 need(sha256(bytes)===source.sha256,'Source PDF integrity failed',409)
 const prepared=await prepareAttachment(db,{filename:'proposify-template.pdf',mediaType:'application/pdf',bytes})
 const document={...previous,fixedPdf:{fileId:prepared.attachment.id,pages:source.pages,source:'proposify' as const},importReport:{unknown:previous.importReport?.unknown??[],unmatched:previous.importReport?.unmatched??[],missing:[...(previous.importReport?.missing??[]),'Proposify fixed pages: rebuild in the editor. No Word reconstruction, source prices, recipient roles or execution authority are adopted.']}}
 const revision=row.revision+1,version=row.version+1,at=await currentTime(db),updated={...row,document,revision},applicationId=crypto.randomUUID()
 const template=outputKind==='template'?await independentFixedTemplate(db,actor,updated,templateName+' — rebuild in the editor',at):null
 const libraryId=outputKind==='library'?crypto.randomUUID():null
 const libraryDocument={version:1,blocks:[{id:crypto.randomUUID(),type:'heading',title:templateName+' — rebuild in the editor',text:''}],fixedPdf:document.fixedPdf,importReport:document.importReport}
 const libraryContent='Proposify fixed pages: rebuild in the editor. Original SHA-256: '+source.sha256
 const libraryWrites=libraryId?[
  db.prepare('INSERT INTO p_library_items(id,title,kind,content,updated_by,updated_at) VALUES(?,?,?,?,?,?)').bind(libraryId,templateName+' — rebuild in the editor','section',libraryContent,actor.id,at),
  db.prepare('INSERT INTO p_imported_library(item_id,document,options) VALUES(?,?,?)').bind(libraryId,JSON.stringify(libraryDocument),'[]'),
  db.prepare('INSERT INTO p_library_media(item_id,file_id) VALUES(?,?)').bind(libraryId,prepared.attachment.id),
 ]:[]
 await commit(db,actor,[...prepared.writes,
  db.prepare('INSERT INTO p_document_media(proposal_id,file_id) VALUES(?,?)').bind(row.id,prepared.attachment.id),
  db.prepare("UPDATE p_proposals SET document=?,version=version+1,revision=?,status='draft',approved_by=NULL,approved_at=NULL,prepared_by=? WHERE id=?").bind(JSON.stringify(document),revision,actor.email,row.id),
  db.prepare('INSERT INTO p_revisions(proposal_id,revision,snapshot,prepared_by,prepared_at,currency) VALUES(?,?,?,?,?,?)').bind(row.id,revision,JSON.stringify(snapshot(updated)),actor.email,at,'USD'),
  copyCosts(db,row.id,row.revision,row.id,revision),...(template?.writes??[]),...libraryWrites,
  db.prepare('INSERT INTO p_imported_document_links(document_id,proposal_id) VALUES(?,?)').bind(source.id,row.id),
  db.prepare('INSERT INTO p_proposify_applications(id,movein_id,document_id,proposal_id,template_id,fingerprint,source_sha256,previous_document,applied_document,applied_version,applied_revision,template_snapshot,created_at,output_kind,library_id) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').bind(applicationId,movein.id,source.id,row.id,template?.id??'',fingerprint,source.sha256,JSON.stringify(previous),JSON.stringify(document),version,revision,canonicalJson({content:template?.snapshot??null,libraryDocument:libraryId?libraryDocument:null,libraryContent:libraryId?libraryContent:null,review}),at,outputKind,libraryId),
 ],false,{sql:"EXISTS(SELECT 1 FROM p_proposals WHERE id=? AND version=? AND status='draft') AND EXISTS(SELECT 1 FROM p_imported_documents WHERE id=? AND revision=?) AND EXISTS(SELECT 1 FROM ik_jobs WHERE id=? AND state='completed') AND NOT EXISTS(SELECT 1 FROM p_collection_policy WHERE proposal_id=?) AND EXISTS(SELECT 1 FROM p_clients WHERE id=? AND name=? AND email=? AND version=?)",values:[row.id,row.version,source.id,stored.revision,movein.job_id,row.id,client.id,client.name,client.email,client.version]})
 return {id:movein.id,applicationId,proposalId:row.id,templateId:template?.id??'',libraryId,outputKind,version,revision}
}

async function undoTemplate(db:D1Database,actor:Actor,input:Record<string,unknown>,movein:any) {
 const application=await db.prepare('SELECT * FROM p_proposify_applications WHERE id=? AND movein_id=?').bind(text(input.applicationId,'an application'),movein.id).first<any>()
 need(application,'Fixed-page application not found',404)
 if(application.reversed_at)return {id:movein.id,applicationId:application.id,undone:true}
 const retained=JSON.parse(application.template_snapshot),retainedSnapshot=retained.content??application.template_snapshot
 const row=await proposal(db,application.proposal_id),template=application.output_kind==='template'?await db.prepare('SELECT * FROM p_personal_templates WHERE id=?').bind(application.template_id).first<any>():null
 need(row.status==='draft'&&row.version===application.applied_version&&canonicalJson(documentOf(row))===canonicalJson(JSON.parse(application.applied_document))&&(!template&&application.output_kind!=='template'||template?.version===1&&template.snapshot===retainedSnapshot),'Later edits or dependent drafts keep these outputs in use',409)
 const at=await currentTime(db),revision=row.revision+1,updated={...row,revision,document:JSON.parse(application.previous_document)}
 let libraryGuard={sql:'1',values:[] as any[]}
 const libraryWrites:D1PreparedStatement[]=[]
 if(application.output_kind==='library'){
  const library=await db.prepare('SELECT * FROM p_library_items WHERE id=?').bind(application.library_id).first<any>()
  need(library?.version===1&&library.content===retained.libraryContent,'Later library edits keep the original in use',409)
  libraryGuard={sql:'EXISTS(SELECT 1 FROM p_library_items WHERE id=? AND version=1 AND content=?) AND NOT EXISTS(SELECT 1 FROM p_library_uses WHERE item_id=?)',values:[library.id,retained.libraryContent,library.id]}
  for(const table of ['p_library_media','p_imported_library'])libraryWrites.push(db.prepare('DELETE FROM '+table+' WHERE item_id=?').bind(library.id))
  libraryWrites.push(db.prepare('DELETE FROM p_library_items WHERE id=?').bind(library.id))
 }
 const writes=template?['p_template_document_media','p_template_defaults','p_template_costs'].map(table=>db.prepare('DELETE FROM '+table+' WHERE template_id=?').bind(template.id)):[]
 await commit(db,actor,[...writes,...libraryWrites,...(template?[db.prepare('DELETE FROM p_personal_templates WHERE id=?').bind(template.id)]:[]),
  db.prepare('UPDATE p_proposals SET document=?,version=version+1,revision=?,prepared_by=? WHERE id=?').bind(application.previous_document,revision,actor.email,row.id),
  db.prepare('INSERT INTO p_revisions(proposal_id,revision,snapshot,prepared_by,prepared_at,currency) VALUES(?,?,?,?,?,?)').bind(row.id,revision,JSON.stringify(snapshot(updated)),actor.email,at,'USD'),
  copyCosts(db,row.id,row.revision,row.id,revision),
  db.prepare('DELETE FROM p_imported_document_links WHERE document_id=? AND proposal_id=?').bind(application.document_id,row.id),
  db.prepare('UPDATE p_proposify_applications SET reversed_at=? WHERE id=?').bind(at,application.id),
 ],false,{sql:"EXISTS(SELECT 1 FROM p_proposals WHERE id=? AND version=? AND status='draft') AND (NOT EXISTS(SELECT 1 FROM p_proposify_applications WHERE id=? AND output_kind='template') OR (EXISTS(SELECT 1 FROM p_personal_templates WHERE id=? AND version=1 AND snapshot=?) AND NOT EXISTS(SELECT 1 FROM p_template_sources WHERE template_id=?))) AND NOT EXISTS(SELECT 1 FROM p_proposify_applications WHERE id=? AND reversed_at IS NOT NULL) AND "+libraryGuard.sql,values:[row.id,row.version,application.id,application.template_id,retainedSnapshot,application.template_id,application.id,...libraryGuard.values]})
 return {id:movein.id,applicationId:application.id,undone:true}
}
