import { permitted } from './permissions'
import { copyAttachments, prepareAttachment, saveVendorDocument, vendorDocuments, type AttachmentKind } from './attachments'
import { commit, exact, need, proposal, snapshot, type Actor } from './model'

// Multipart uploads use the same session, CSRF and exact-version checks as edits.
export async function attachmentUpload(db:D1Database,a:Actor,form:FormData){
 need(a.role!=='agent','A person uploads proposal documents',403)
 const file=form.get('file'),kind=form.get('kind')
 need(file instanceof File,'Choose an attachment file')
 const upload={filename:file.name,mediaType:file.type,bytes:await file.arrayBuffer()}
 if(kind){const attachment=await saveVendorDocument(db,a,kind as AttachmentKind,upload);return {id:undefined,attachment}}
 const row=await permitted(db,a,form.get('id'),'edit');exact(row,{version:form.get('version')})
 need(row.status==='draft'||row.status==='approved','Upload attachments before sending',409)
 const prepared=await prepareAttachment(db,upload),attachments=[...copyAttachments(JSON.parse(row.attachments)),prepared.attachment]
 return saveRevision(db,a,row,attachments,prepared.writes)
}
export async function refreshVendorDocuments(db:D1Database,a:Actor,input:Record<string,unknown>){
 need(a.role!=='agent','A person attaches vendor documents',403)
 const row=await proposal(db,input.id);exact(row,input)
 need(row.status==='draft'||row.status==='approved','Change attachments before sending',409)
 return saveRevision(db,a,row,[...copyAttachments(JSON.parse(row.attachments)).filter(f=>!f.kind),...await vendorDocuments(db)])
}
async function saveRevision(db:D1Database,a:Actor,row:any,attachments:ReturnType<typeof copyAttachments>,writes:D1PreparedStatement[]=[]){
 const revision=row.revision+1,at=Date.now(),saved=JSON.stringify(snapshot({...row,revision,attachments}))
 await commit(db,a,[...writes,db.prepare("UPDATE p_proposals SET attachments=?,revision=?,version=version+1,status='draft',prepared_by=?,approved_by=NULL,approved_at=NULL WHERE id=?").bind(JSON.stringify(attachments),revision,a.email,row.id),db.prepare('INSERT INTO p_revisions(proposal_id,revision,snapshot,prepared_by,prepared_at,currency) VALUES(?,?,?,?,?,?)').bind(row.id,revision,saved,a.email,at,row.currency)],false,{sql:"EXISTS(SELECT 1 FROM p_proposals WHERE id=? AND version=? AND status IN ('draft','approved'))",values:[row.id,row.version]})
 return {id:row.id,revision}
}
