import { Buffer } from 'node:buffer'
import { canonicalJson, sha256, type Json } from '../../modules/import-kit/src/d1/index.ts'
import { businessSource } from './business-source'
import { documentSource, documentNamespace, type UploadedDocument } from './document-source'
import { fail } from './errors'

function object(value: unknown, name: string): Record<string, any> {
 if (typeof value === 'string') { try { value = JSON.parse(value) } catch { fail('invalid_review',400,'Review '+name+' as a JSON object') } }
 if (!value || typeof value !== 'object' || Array.isArray(value)) fail('invalid_review',400,'Review '+name+' as an object')
 return value as Record<string, any>
}
export function betterProposalsReview(input: Record<string,unknown>) {
 return { contactsFile: String(input.contactsFile ?? ''), mapping: object(input.mapping ?? {},'contact columns'),
  bindings: object(input.bindings ?? Object.fromEntries(Object.entries(input).filter(([k])=>k.startsWith('bind:')).map(([k,v])=>[k.slice(5),v])),'document bindings'),
  contactChoices: object(input.contactChoices ?? Object.fromEntries(Object.entries(input).filter(([k])=>k.startsWith('contact:')).map(([k,v])=>[k.slice(8),v])),'contact decisions') }
}
/** Export custody only: no provider requests, inferred facts or execution authority. */
export async function betterProposalsExport(uploads: UploadedDocument[], choices: Record<string,string>, moveinId: string, review: ReturnType<typeof betterProposalsReview>) {
 const csv = uploads.find(u=>u.sha256===review.contactsFile && /\.csv$/i.test(u.filename))
 if (!csv) fail('contacts_file_required',400,'Select the uploaded contacts CSV and review its column mapping')
 const business = businessSource({kind:'contacts',format:'mapping',csv:Buffer.from(csv.bytes).toString('utf8'),mapping:review.mapping})
 const prepared = await documentSource(uploads.filter(u=>u!==csv),choices,moveinId)
 if (!prepared.documents.length || prepared.documents.length>30) fail('document_limit',400,'Choose between one and 30 downloaded proposal PDFs')
 const contacts=business.contacts, ids=new Set(contacts.map(c=>c.id)), held=new Set<string>(), ambiguous=new Set<string>()
 for (const contact of contacts) {
  const key=canonicalJson([contact.company_id,contact.first_name??'',contact.last_name??''])
  if(contacts.some(other=>other!==contact && (contact.email && contact.email===other.email || key===canonicalJson([other.company_id,other.first_name??'',other.last_name??''])))) ambiguous.add(contact.id)
  const choice=review.contactChoices[contact.id]
  if(choice!==undefined && choice!=='include' && choice!=='held') fail('invalid_review',400,'Choose include or held for each contact')
  if(choice==='held'||ambiguous.has(contact.id)&&choice!=='include') held.add(contact.id)
 }
 // Revisit ambiguity after the complete group is known; nothing is selected by name.
 for(const id of ambiguous)if(review.contactChoices[id]!=='include')held.add(id)
 if(Object.keys(review.contactChoices).some(id=>!ids.has(id))) fail('invalid_review',409,'Review the current CSV contacts again')
 const retained=contacts.filter(c=>!held.has(c.id)), companyIds=new Set(retained.map(c=>c.company_id).filter(Boolean))
 const diagnostics=business.source.diagnostics.filter(d=>d.code!=='duplicate_contact_email')
 const emails=new Set<string>()
 for(const c of retained)if(c.email){if(emails.has(String(c.email)))diagnostics.push({severity:'error',code:'ambiguous_contact',message:'Keep only one contact with this exact email; hold the other source rows for review'});emails.add(String(c.email))}
 const knownDocuments=new Set(prepared.documents.map(d=>d.id))
 if(Object.keys(review.bindings).some(id=>!knownDocuments.has(id)))fail('invalid_review',409,'Review the current PDF bindings again')
 const bindings=prepared.documents.map(p=>{
  const contactId=review.bindings[p.id]
  if(contactId && contactId!=='held' && (!ids.has(contactId)||held.has(contactId))) fail('invalid_document_binding',409,'Bind only a retained contact or hold the document')
  return {documentId:p.id,contactId:contactId&&contactId!=='held'?contactId:null}
 })
 const sourceRecords=business.source.records.filter(r=>r.kind==='contacts'?!held.has(r.sourceId):companyIds.has(r.sourceId)).map(r=>{
  const payload={...r.payload as any,value:{...(r.payload as any).value,version:1,movein_source:{provider:'betterproposals',moveinId,contactsSha256:csv.sha256}}}
  return {...r,namespace:documentNamespace,payload:payload as Json,payloadHash:sha256(canonicalJson(payload))}
 })
 for(const record of prepared.source.records){
  const value=(record.payload as any).value, contactId=bindings.find(b=>b.documentId===value.id)!.contactId
  value.contactId=contactId
  value.sourceProvider='betterproposals'
  value.contactSourceSha256=csv.sha256
  if(!contactId)value.disposition='held-contact-review'
  record.payloadHash=sha256(canonicalJson(record.payload))
 }
 const arrived=prepared.documents.filter(p=>p.signatureEvidence.length&&bindings.find(b=>b.documentId===p.id)!.contactId).length
 const report={...prepared.report,arrived,held:prepared.documents.length-arrived,provider:'betterproposals',
  contactsArrived:retained.length,contactsHeld:held.size,companiesArrived:companyIds.size,
  unmapped:prepared.report.unmapped+business.report.unmappedColumns.length,unmappedColumns:business.report.unmappedColumns,
  bindings,contacts:contacts.map(c=>({...c,held:held.has(c.id),ambiguous:ambiguous.has(c.id)})),
  notes:[...prepared.report.notes,'Only explicitly reviewed contact bindings are adopted. Ambiguous identities and unbound documents stay held.',
   'API enrichment, template and library conversion, priced catalog adoption, open-document reissue and recipient roles are not imported.']}
 const reviewBytes=Buffer.from(canonicalJson({provider:'betterproposals',review,report}))
 prepared.source.records=[...sourceRecords,...prepared.source.records]
 prepared.source.artifacts.push(...business.source.artifacts,{name:'uploads/'+csv.sha256+'/'+csv.filename,sha256:csv.sha256,size:csv.bytes.length,original:{status:'available',base64:Buffer.from(csv.bytes).toString('base64')}},
  {name:'betterproposals-review.json',sha256:sha256(reviewBytes),size:reviewBytes.length,original:{status:'available',base64:reviewBytes.toString('base64')}})
 prepared.source.diagnostics.push(...diagnostics)
 return {...prepared,report,review,companies:business.companies.filter(c=>companyIds.has(c.id)),contacts,
  canApply:prepared.canApply&&!diagnostics.some(d=>d.severity==='error')}
}
