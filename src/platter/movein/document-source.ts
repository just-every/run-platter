import { Buffer } from 'node:buffer'
import { unzipSync } from 'fflate'
import { PDFDocument } from 'pdf-lib'
import { canonicalJson, sha256, type Json, type SourceArtifact, type SourceBundle } from '../../modules/import-kit/src/d1/index.ts'
import { extractText, getDocumentProxy } from 'unpdf'
import { parseBusinessCsv } from './business-csv'
import { fail } from './errors'
import { mappedProposifyReport, proposifyOmissions, type DocumentReview } from './proposify-export'

export const documentNamespace = 'platter.exported-documents.v1'
export type UploadedDocument = { filename: string; sha256: string; bytes: Uint8Array }
const normalized = (text: string) => text.trim().replace(/\s+/g, ' ').toLowerCase()
type Pdf = { id: string; sha256: string; filename: string; title: string; client: string; date: string; pages: number;
 signatureEvidence: { kind: string; page: number; text: string }[]; sources: string[]; base64: string }
type ReportRow = { id: string; source: string; line: number; title: string; client: string; date: string; fields: Record<string,string>; candidates: string[]; selected: string | null; evidence?: Record<string,string>; requiresChoice?: boolean }
export async function documentSource(uploads: UploadedDocument[], choices: Record<string,string>, moveinId: string, review?: DocumentReview) {
 const artifacts: SourceArtifact[] = [], pdfs = new Map<string,Pdf>(), rows: ReportRow[] = [], seenReports = new Set<string>(), unmapped: string[] = review?[...proposifyOmissions]:[]
 let expanded = 0, duplicateDocuments = 0, mappingRequired = false
 const reportColumns: string[] = []
 const artifact = (name: string, bytes: Uint8Array) => {
  artifacts.push({ name, sha256: sha256(bytes), size: bytes.length, original: { status: 'available', base64: Buffer.from(bytes).toString('base64') } })
 }
 const read = async (filename: string, bytes: Uint8Array, source: string) => {
  if (/\.pdf$/i.test(filename)) {
   const hash = sha256(bytes), previous = pdfs.get(hash)
   if (previous) { previous.sources.push(source); duplicateDocuments++; return }
   let pdf
   try { pdf = await PDFDocument.load(bytes) } catch { fail('invalid_pdf',400,'Upload a readable, unencrypted PDF: '+filename) }
   if (!pdf.getPageCount() || pdf.getPageCount()>100) fail('invalid_pdf',400,'PDFs may contain up to 100 pages')
   // Source evidence only. No certificate is represented as cryptographically validated.
   const signatureEvidence: Pdf['signatureEvidence'] = []
   let text = ''
   const proxy = await getDocumentProxy(new Uint8Array(bytes))
   try {
    const pages = await extractText(proxy,{mergePages:false})
    text = pages.text.join('\n')
    for (const [i,page] of pages.text.entries()) {
     const match = page.match(/certificate of completion|signature certificate|e.?signature certificate|signature page/i)
     if (match) signatureEvidence.push({kind:/certificate/i.test(match[0])?'certificate':'signature-page',page:i+1,text:match[0]})
    }
   } catch { fail('invalid_pdf',400,'The PDF text could not be read: '+filename) } finally { await proxy.destroy() }
   const title = pdf.getTitle()?.trim() || filename.split('/').at(-1)!.replace(/\.pdf$/i,'')
   const client = text.match(/Client:\s*([^\r\n]+?)(?=\s+(?:Date|Status|Title|Document):|[\r\n]|$)/i)?.[1]?.trim() || pdf.getSubject()?.trim() || ''
   const date = text.match(/Date:\s*(\d{4}-\d{2}-\d{2})/)?.[1] || pdf.getCreationDate()?.toISOString().slice(0,10) || ''
   pdfs.set(hash,{id:hash,sha256:hash,filename,title,client,date,pages:pdf.getPageCount(),signatureEvidence,sources:[source],base64:Buffer.from(bytes).toString('base64')})
   artifact('documents/'+hash+'.pdf',bytes)
  } else if (/\.csv$/i.test(filename)) {
   if (seenReports.has(sha256(bytes))) return
   seenReports.add(sha256(bytes))
   const parsed = parseBusinessCsv(Buffer.from(bytes).toString('utf8'),',')
   for (const header of parsed.headers) if (!reportColumns.includes(header)) reportColumns.push(header)
   if (review) {
    if (!mappedProposifyReport(parsed.headers,parsed.rows[0].cells,review)) { mappingRequired=true;unmapped.push(source+': explicitly map every Proposify report column');return }
    for (const [i,row] of parsed.rows.entries()) {
     const evidence=mappedProposifyReport(parsed.headers,row.cells,review)!
     rows.push({id:sha256(bytes)+':'+(i+1),source,line:row.line,title:evidence.title,client:evidence.client,date:evidence.createdDate,evidence,fields:Object.fromEntries(parsed.headers.map((h,i)=>[h,row.cells[i]])),candidates:[],selected:null})
    }
    return
   }
   const aliases = {title:['title','document name','proposal name','name'],client:['client','client name'],date:['date','created date','created on']}
   const columns = Object.fromEntries(Object.entries(aliases).map(([key,names])=>[key,parsed.headers.findIndex(h=>names.includes(normalized(h)))]))
   if (Object.values(columns).some(i=>i<0)) { unmapped.push(source+': report needs Title, Client and Date columns'); return }
   for (const [i,row] of parsed.rows.entries()) rows.push({id:sha256(bytes)+':'+(i+1),source,line:row.line,
    title:row.cells[columns.title],client:row.cells[columns.client],date:row.cells[columns.date],
    fields:Object.fromEntries(parsed.headers.map((h,i)=>[h,row.cells[i]])),candidates:[],selected:null})
  } else unmapped.push(source)
 }
 for (const upload of uploads) {
  artifact('uploads/'+upload.sha256+'/'+upload.filename,upload.bytes)
  if (/\.zip$/i.test(upload.filename)) {
   let files: Record<string,Uint8Array>
   try {
    let entries=0
    files=unzipSync(upload.bytes,{filter:file=>{
     if (++entries>600 || file.originalSize>5*1024*1024 || (expanded+=file.originalSize)>20*1024*1024) throw Error('Archive too large')
     if (file.name.split('/').some(p=>p==='..') || file.name.startsWith('/') || file.name.includes('\\')) throw Error('Unsafe archive path')
     return !file.name.endsWith('/')
    }})
   } catch { fail('invalid_zip',400,'Choose a readable ZIP with at most 600 entries, 5 MiB per file and 20 MiB expanded in total') }
   for (const [name,bytes] of Object.entries(files)) await read(name,bytes,upload.filename+': '+name)
  } else await read(upload.filename,upload.bytes,upload.filename)
 }
 const documents=[...pdfs.values()].sort((a,b)=>a.id.localeCompare(b.id))
 if(review?.templateDocument&&!documents.some(p=>p.id===review.templateDocument&&!p.signatureEvidence.length))fail('invalid_template_source',409,'Identify a separate unsigned template PDF; signed-source originals cannot become templates')
 for (const row of rows) {
  row.candidates=documents.filter(p=>p.id!==review?.templateDocument&&normalized(p.title)===normalized(row.title)&&(!p.client||normalized(p.client)===normalized(row.client))&&(!p.date||p.date===row.date)).map(p=>p.id)
  if(review&&row.candidates.length===0){row.candidates=documents.filter(p=>p.id!==review.templateDocument).map(p=>p.id);row.requiresChoice=true}
  if (Object.hasOwn(choices,row.id) && choices[row.id]!=='unmapped' && !row.candidates.includes(choices[row.id])) fail('invalid_report_choice',409,'Choose a PDF offered for this report row')
  row.selected=choices[row.id]==='unmapped'?null:choices[row.id] || (row.candidates.length===1&&!row.requiresChoice?row.candidates[0]:null)
 }
 if (Object.keys(choices).some(key=>!rows.some(row=>row.id===key))) fail('invalid_report_choice',409,'Preview the current report rows again')
 const selected=rows.filter(r=>r.selected).map(r=>r.selected)
 const conflicts=rows.filter(r=>(r.candidates.length>1||r.requiresChoice)&&!Object.hasOwn(choices,r.id))
 if (new Set(selected).size!==selected.length) fail('duplicate_report_choice',409,'Each PDF can match only one report row; mark extra rows unmapped')
 if(review?.templateDocument&&rows.some(r=>normalized(r.title)===normalized(documents.find(p=>p.id===review.templateDocument)!.title)))fail('invalid_template_source',409,'The template must be separate from the report proposals')
 const report={provider:review?'proposify':'generic',reportColumns,mappingRequired,configuration:review??null,templates:review?.templateDocument?[{id:review.templateDocument,label:'rebuild in the editor'}]:[],arrived:documents.filter(p=>p.signatureEvidence.length).length,
  held:documents.filter(p=>!p.signatureEvidence.length).length+conflicts.length,
  unmapped:unmapped.length+rows.filter(r=>!r.selected&&!conflicts.includes(r)).length,
  duplicateDocuments,unmappedItems:unmapped,rows,
  notes:['Signature pages and certificates are source evidence, not validated signatures.',review?'Open originals stay read-only; separately review fixed-page reissue with current clients, fresh prices and human approval.':'Open documents are retained read-only for review; reissue and editable conversion are not available here.','Attachments, roles, formulas, omitted images, comments, analytics and audit events beyond the supplied certificate are not reconstructed.']}
 artifact('reviewed-report-choices.json',Buffer.from(canonicalJson({choices,report,review:review??null})))
 const source: SourceBundle={artifacts,diagnostics:conflicts.map(r=>({severity:'error',code:'ambiguous_report',message:'Choose a PDF for report row '+r.line,location:{artifact:r.source,row:r.line}})),
  records:documents.map(p=>{
   const {base64,...metadata}=p
   const value={...metadata,moveinId,provider:review?'proposify':'generic',disposition:p.id===review?.templateDocument?'held-template':p.signatureEvidence.length?'retained-agreement':'held-open-document',report:rows.find(r=>r.selected===p.id)?.fields??null,...(review?{sourceEvidence:rows.find(r=>r.selected===p.id)?.evidence??null}:{})}
   const payload={value}
   return {namespace:documentNamespace,kind:'documents',sourceId:p.id,payload:payload as unknown as Json,payloadHash:sha256(canonicalJson(payload)),artifactHash:p.sha256,location:{artifact:'documents/'+p.sha256+'.pdf'}}
  })}
 return {source,documents:documents.map(({base64,...p})=>p),report,canApply:conflicts.length===0&&!mappingRequired}
}
