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

/** Only an explicitly identified template may enter an owner-selected, already priced draft. */
export async function proposifyTemplateCommand(db:D1Database,actor:Actor,name:string,input:Record<string,unknown>,movein:any,kit:D1ImportContext) {
 if (name==='document-import.template-undo') return undoTemplate(db,actor,input,movein)
 need(movein.provider==='proposify'&&movein.job_id,'Apply a reviewed Proposify move-in first',409)
 if(name==='document-import.template-apply') {
  const replay=await db.prepare('SELECT * FROM p_proposify_applications WHERE movein_id=? AND fingerprint=?').bind(movein.id,String(input.fingerprint)).first<any>()
  if(replay){need(!replay.reversed_at,'This application was undone; review a new destination',409);return {id:movein.id,applicationId:replay.id,proposalId:replay.proposal_id,templateId:replay.template_id,version:replay.applied_version,revision:replay.applied_revision}}
 }
 const sourceId=JSON.parse(movein.configuration_json).templateDocument
 const stored=await db.prepare('SELECT * FROM p_imported_documents WHERE id=?').bind(sourceId??'').first<any>()
 need(stored,'Choose a separately identified template PDF in the move-in review',409)
 const source=JSON.parse(stored.data_json)
 need(source.moveinId===movein.id&&source.provider==='proposify'&&source.disposition==='held-template','Only the separately reviewed template PDF can be applied',409)
 const state=await db.prepare('SELECT state FROM ik_jobs WHERE id=?').bind(movein.job_id).first<any>()
 need(state?.state==='completed','Finish applying the move-in before using its template',409)
 if(input.proposalChoice){const [id,version]=String(input.proposalChoice).split(':');input={...input,proposalId:id,version}}
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
 const templateName=text(input.templateName,'an independent template name',150)
 need(input.consent===true||input.consent==='yes','Confirm the fixed pages and the destination draft prices')
 const fingerprint=sha256(canonicalJson({movein:movein.id,review:movein.fingerprint,configuration:movein.configuration_json,source:stored.revision,content,version:row.version,templateName,consent:true}))
 if(name==='document-import.template-preview') return {id:movein.id,kind:'Proposify fixed pages',fingerprint,proposalId:row.id,version:row.version,templateName,sourceTitle:source.title,sourceSha256:source.sha256,prices:content.options.map((o:any)=>({name:o.label,cents:o.cents})),pages:source.pages}
 need(name==='document-import.template-apply','Unknown fixed-page command',400)
 need(input.fingerprint===fingerprint,'The reviewed bytes, destination, prices or name changed; preview again',409)
 const originals=await readD1ImportOriginals(movein.job_id,kit),file=originals.find(o=>o.name==='documents/'+source.sha256+'.pdf')
 need(file?.original.status==='retained','The source PDF is unavailable',409)
 const bytes=Buffer.from(file.original.base64,'base64')
 need(sha256(bytes)===source.sha256,'Source PDF integrity failed',409)
 const prepared=await prepareAttachment(db,{filename:'proposify-template.pdf',mediaType:'application/pdf',bytes})
 const document={...previous,fixedPdf:{fileId:prepared.attachment.id,pages:source.pages,source:'proposify' as const},importReport:{unknown:[],unmatched:[],missing:['Proposify fixed pages: rebuild in the editor. No Word reconstruction, source prices, recipient roles or execution authority are adopted.']}}
 const revision=row.revision+1,version=row.version+1,at=await currentTime(db),updated={...row,document,revision},applicationId=crypto.randomUUID()
 const template=await independentFixedTemplate(db,actor,updated,templateName+' — rebuild in the editor',at)
 await commit(db,actor,[...prepared.writes,
  db.prepare('INSERT INTO p_document_media(proposal_id,file_id) VALUES(?,?)').bind(row.id,prepared.attachment.id),
  db.prepare("UPDATE p_proposals SET document=?,version=version+1,revision=?,status='draft',approved_by=NULL,approved_at=NULL,prepared_by=? WHERE id=?").bind(JSON.stringify(document),revision,actor.email,row.id),
  db.prepare('INSERT INTO p_revisions(proposal_id,revision,snapshot,prepared_by,prepared_at,currency) VALUES(?,?,?,?,?,?)').bind(row.id,revision,JSON.stringify(snapshot(updated)),actor.email,at,'USD'),
  copyCosts(db,row.id,row.revision,row.id,revision),...template.writes,
  db.prepare('INSERT INTO p_imported_document_links(document_id,proposal_id) VALUES(?,?)').bind(source.id,row.id),
  db.prepare('INSERT INTO p_proposify_applications(id,movein_id,document_id,proposal_id,template_id,fingerprint,source_sha256,previous_document,applied_document,applied_version,applied_revision,template_snapshot,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)').bind(applicationId,movein.id,source.id,row.id,template.id,fingerprint,source.sha256,JSON.stringify(previous),JSON.stringify(document),version,revision,template.snapshot,at),
 ],false,{sql:"EXISTS(SELECT 1 FROM p_proposals WHERE id=? AND version=? AND status='draft') AND EXISTS(SELECT 1 FROM p_imported_documents WHERE id=? AND revision=?) AND EXISTS(SELECT 1 FROM ik_jobs WHERE id=? AND state='completed') AND NOT EXISTS(SELECT 1 FROM p_collection_policy WHERE proposal_id=?)",values:[row.id,row.version,source.id,stored.revision,movein.job_id,row.id]})
 return {id:movein.id,applicationId,proposalId:row.id,templateId:template.id,version,revision}
}

async function undoTemplate(db:D1Database,actor:Actor,input:Record<string,unknown>,movein:any) {
 const application=await db.prepare('SELECT * FROM p_proposify_applications WHERE id=? AND movein_id=?').bind(text(input.applicationId,'an application'),movein.id).first<any>()
 need(application,'Fixed-page application not found',404)
 if(application.reversed_at)return {id:movein.id,applicationId:application.id,undone:true}
 const row=await proposal(db,application.proposal_id),template=await db.prepare('SELECT * FROM p_personal_templates WHERE id=?').bind(application.template_id).first<any>()
 need(row.status==='draft'&&row.version===application.applied_version&&canonicalJson(documentOf(row))===canonicalJson(JSON.parse(application.applied_document))&&template?.version===1&&template.snapshot===application.template_snapshot,'Later edits or dependent drafts keep these outputs in use',409)
 const at=await currentTime(db),revision=row.revision+1,updated={...row,revision,document:JSON.parse(application.previous_document)}
 const writes=['p_template_document_media','p_template_defaults','p_template_costs'].map(table=>db.prepare('DELETE FROM '+table+' WHERE template_id=?').bind(template.id))
 await commit(db,actor,[...writes,db.prepare('DELETE FROM p_personal_templates WHERE id=?').bind(template.id),
  db.prepare('UPDATE p_proposals SET document=?,version=version+1,revision=?,prepared_by=? WHERE id=?').bind(application.previous_document,revision,actor.email,row.id),
  db.prepare('INSERT INTO p_revisions(proposal_id,revision,snapshot,prepared_by,prepared_at,currency) VALUES(?,?,?,?,?,?)').bind(row.id,revision,JSON.stringify(snapshot(updated)),actor.email,at,'USD'),
  copyCosts(db,row.id,row.revision,row.id,revision),
  db.prepare('DELETE FROM p_imported_document_links WHERE document_id=? AND proposal_id=?').bind(application.document_id,row.id),
  db.prepare('UPDATE p_proposify_applications SET reversed_at=? WHERE id=?').bind(at,application.id),
 ],false,{sql:"EXISTS(SELECT 1 FROM p_proposals WHERE id=? AND version=? AND status='draft') AND EXISTS(SELECT 1 FROM p_personal_templates WHERE id=? AND version=1 AND snapshot=?) AND NOT EXISTS(SELECT 1 FROM p_template_sources WHERE template_id=?) AND NOT EXISTS(SELECT 1 FROM p_proposify_applications WHERE id=? AND reversed_at IS NOT NULL)",values:[row.id,row.version,template.id,application.template_snapshot,template.id,application.id]})
 return {id:movein.id,applicationId:application.id,undone:true}
}
