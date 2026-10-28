import { Buffer } from 'node:buffer'
import { unzipSync } from 'fflate'
import { PDFDocument } from 'pdf-lib'
import { canonicalJson, sha256, type Json, type SourceArtifact, type SourceBundle } from '../../modules/import-kit/src/d1/index.ts'
import { pdfSearchText } from '../documents/pdf-search'
import { parseBusinessCsv } from './business-csv'
import { fail } from './errors'

export const documentNamespace = 'platter.exported-documents.v1'
export type UploadedDocument = { filename: string; sha256: string; bytes: Uint8Array }
const normalized = (text: string) => text.trim().replace(/\s+/g, ' ').toLowerCase()
type Pdf = { id: string; sha256: string; filename: string; title: string; client: string; date: string; pages: number;
 signatureEvidence: { kind: string; page: number; text: string }[]; sources: string[]; base64: string }
type ReportRow = { id: string; source: string; line: number; title: string; client: string; date: string; fields: Record<string,string>; candidates: string[]; selected: string | null }
export async function documentSource(uploads: UploadedDocument[], choices: Record<string,string>) {
 const artifacts: SourceArtifact[] = [], pdfs = new Map<string,Pdf>(), rows: ReportRow[] = [], seenReports = new Set<string>(), unmapped: string[] = []
 let expanded = 0, duplicateDocuments = 0
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
   const text = await pdfSearchText(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength) as ArrayBuffer)
   // Source evidence only. No certificate is represented as cryptographically validated.
   const { extractText, getDocumentProxy } = await import('unpdf')
   const signatureEvidence: Pdf['signatureEvidence'] = []
   const proxy = await getDocumentProxy(bytes.slice())
   try {
    const pages = await extractText(proxy,{mergePages:false})
    for (const [i,page] of pages.text.entries()) {
     const match = page.match(/certificate of completion|signature certificate|e.?signature certificate|signature page/i)
     if (match) signatureEvidence.push({kind:/certificate/i.test(match[0])?'certificate':'signature-page',page:i+1,text:match[0]})
    }
   } finally { await proxy.destroy() }
   const title = pdf.getTitle()?.trim() || filename.split('/').at(-1)!.replace(/\.pdf$/i,'')
   const client = text.match(/Client:\s*([^\r\n]+)/i)?.[1]?.trim() || pdf.getSubject()?.trim() || ''
   const date = text.match(/Date:\s*(\d{4}-\d{2}-\d{2})/)?.[1] || pdf.getCreationDate()?.toISOString().slice(0,10) || ''
   pdfs.set(hash,{id:hash,sha256:hash,filename,title,client,date,pages:pdf.getPageCount(),signatureEvidence,sources:[source],base64:Buffer.from(bytes).toString('base64')})
   artifact('documents/'+hash+'.pdf',bytes)
  } else if (/\.csv$/i.test(filename)) {
   if (seenReports.has(sha256(bytes))) return
   seenReports.add(sha256(bytes))
   const parsed = parseBusinessCsv(Buffer.from(bytes).toString('utf8'),',')
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
 for (const row of rows) {
  row.candidates=documents.filter(p=>normalized(p.title)===normalized(row.title)&&(!p.client||normalized(p.client)===normalized(row.client))&&(!p.date||p.date===row.date)).map(p=>p.id)
  if (choices[row.id] && choices[row.id]!=='unmapped' && !row.candidates.includes(choices[row.id])) fail('invalid_report_choice',409,'Choose a PDF offered for this report row')
  row.selected=choices[row.id]==='unmapped'?null:choices[row.id] || (row.candidates.length===1?row.candidates[0]:null)
 }
 if (Object.keys(choices).some(key=>!rows.some(row=>row.id===key))) fail('invalid_report_choice',409,'Preview the current report rows again')
 const selected=rows.filter(r=>r.selected).map(r=>r.selected)
 const conflicts=rows.filter(r=>r.candidates.length>1&&!Object.hasOwn(choices,r.id))
 if (new Set(selected).size!==selected.length) fail('duplicate_report_choice',409,'Each PDF can match only one report row; mark extra rows unmapped')
 const report={arrived:documents.filter(p=>p.signatureEvidence.length).length,
  held:documents.filter(p=>!p.signatureEvidence.length).length+conflicts.length,
  unmapped:unmapped.length+rows.filter(r=>!r.selected&&!conflicts.includes(r)).length,
  duplicateDocuments,unmappedItems:unmapped,rows,
  notes:['Signature pages and certificates are source evidence, not validated signatures.','Open documents are retained read-only for review; reissue and editable conversion are not available here.','Attachments, roles, formulas, omitted images, comments, analytics and audit events beyond the supplied certificate are not reconstructed.']}
 artifact('reviewed-report-choices.json',Buffer.from(canonicalJson({choices,report})))
 const source: SourceBundle={artifacts,diagnostics:conflicts.map(r=>({severity:'error',code:'ambiguous_report',message:'Choose a PDF for report row '+r.line,location:{artifact:r.source,row:r.line}})),
  records:documents.map(p=>{
   const {base64,...metadata}=p
   const value={...metadata,disposition:p.signatureEvidence.length?'retained-agreement':'held-open-document',report:rows.find(r=>r.selected===p.id)?.fields??null}
   const payload={value,base64}
   return {namespace:documentNamespace,kind:'documents',sourceId:p.id,payload:payload as unknown as Json,payloadHash:sha256(canonicalJson(payload)),artifactHash:p.sha256,location:{artifact:'documents/'+p.sha256+'.pdf'}}
  })}
 return {source,documents:documents.map(({base64,...p})=>p),report,canApply:conflicts.length===0}
}
