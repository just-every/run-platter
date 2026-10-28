import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import type { Bindings } from '../../auth.server'
import { command } from '../commands'
import { editableVariableFields } from '../variables'
import { commit, exact, need, snapshot, type Actor } from '../model'
import { permitted, editors } from '../permissions'
import { negotiatedView, pendingNegotiation } from '../negotiation'
import { prepareAttachment } from '../attachments'
import { documentOf } from './blocks'
import { mediaBytes } from './media'
import { offerPdf } from './offer-pdf'
import { pdfFonts } from './pdf-fonts'
import { readWord, writeWord } from './word'

/** Imports are explicit revision edits. Original uploaded PDFs never become editable content. */
export async function importDocument(env:Bindings,a:Actor,data:FormData){
 need(editors.includes(a.role),'A proposal editor imports documents',403)
 const original=await permitted(env.DB,a,data.get('id'),'edit');exact(original,{version:data.get('version')})
 const row=negotiatedView(original,await pendingNegotiation(env.DB,original.id));need(['draft','approved'].includes(row.status),'Import into an unsent draft',409)
 need(data.get('consent')==='yes','Authorize displaying this document to proposal recipients')
 const file=data.get('file');need(file instanceof File&&file.size>0&&file.size<=10*1024*1024,'Choose a Word document or PDF up to 10 MiB',413)
 const bytes=new Uint8Array(await file.arrayBuffer()),db=env.DB,fields=editableVariableFields(row),document=documentOf(row),report={unknown:[] as string[],unmatched:[] as string[],missing:[] as string[]},writes:D1PreparedStatement[]=[]
 const retain=async(filename:string,mediaType:string,bytes:Uint8Array)=>{const prepared=await prepareAttachment(db,{filename,mediaType,bytes});writes.push(...prepared.writes,db.prepare('INSERT INTO p_document_media(proposal_id,file_id) VALUES(?,?)').bind(row.id,prepared.attachment.id));return prepared.attachment.id}
 if(/\.pdf$/i.test(file.name)){
  need(bytes[0]===37&&bytes[1]===80&&bytes[2]===68&&bytes[3]===70,'The file is not a PDF')
  let pdf;try{pdf=await PDFDocument.load(bytes)}catch{need(false,'Upload an unencrypted, readable PDF')}
  need(pdf!.getPageCount()>0&&pdf!.getPageCount()<=100,'Use between 1 and 100 fixed pages')
  need(!document.fixedPdf,'This proposal already has fixed pages',409)
  document.fixedPdf={fileId:await retain(file.name,'application/pdf',bytes),pages:pdf!.getPageCount()}
 }else{
  need(/\.docx$/i.test(file.name),'Upload a .docx or .pdf file')
  const imported=readWord(bytes);report.unknown=imported.unknown;report.missing=imported.missing
  const catalog=[...(await db.prepare('SELECT id,sku,name FROM p_priced_catalog').all<any>()).results,...(await db.prepare('SELECT id,data_json FROM p_catalog_items').all<any>()).results.map(r=>({id:r.id,...JSON.parse(r.data_json)}))]
  const tables=fields.pricingTables,optionId=String(data.get('optionId')??fields.packages[0].id),option=fields.packages.find((o:any)=>o.id===optionId);need(option,'Choose an offered package')
  const parts:any[]=[]
  for(const part of imported.parts){
   const id=crypto.randomUUID()
   if(part.type==='image'){
    const image=imported.files[part.path!],type=image[0]===137?'image/png':image[0]===255&&image[1]===216?'image/jpeg':'';need(type,'Word images must be PNG or JPEG')
    try{const probe=await PDFDocument.create();const decoded=type==='image/png'?await probe.embedPng(image):await probe.embedJpg(image);need(decoded.width*decoded.height<=16000000,'Word images must be at most 16 megapixels')}catch{need(false,'A Word image cannot be decoded')}
    parts.push({id,type:'image',title:'',text:'',assetId:await retain(part.path!.split('/').at(-1)!,type,image),alt:part.title});continue
   }
   if(part.type==='table'){
    const rows=part.text.split('\n').map(r=>r.split('\t')),headers=rows[0].map(h=>h.trim().toLowerCase()),column=(pattern:RegExp)=>headers.findIndex(h=>pattern.test(h)),price=column(/^(unit\s*)?price$|^rate$/),quantity=column(/^qty$|^quantity$/),sku=column(/^sku$/),name=column(/^name$|^item$|^product$|^description$/)
    if(price>=0||quantity>=0||sku>=0){
     need(price>=0,'A quote table needs a price column')
     const lines=rows.slice(1).filter(r=>r.some(c=>c.trim())).map((r,index)=>{const match=catalog.find(c=>sku>=0&&r[sku]&&String(c.sku).toLowerCase()===r[sku].toLowerCase())??catalog.find(c=>name>=0&&String(c.name).toLowerCase()===r[name]?.toLowerCase()),label=r[name]||match?.name||r[sku]||'Imported line '+(index+1);if(!match)report.unmatched.push(label);return {name:label,description:'',unit:'each',quantity:quantity>=0?r[quantity]:'1',unitPrice:r[price].replace(/[$,]/g,''),...(match?{catalogId:match.id}:{})}})
     const index=tables.filter((t:any)=>t.optionId===optionId).length;tables.push({optionId,name:'Imported quote',lines});parts.push({id,type:'pricing',title:'',text:'',optionId,tableIndex:index});report.missing.push('Quote table images absent from the Word download cannot be recovered.');continue
    }
   }
   parts.push({id,type:part.type,title:part.title,text:part.text,...(part.level?{headingLevel:part.level}:{})})
  }
  if(data.get('mode')==='library'){
   need(['owner','admin','manager','content_editor'].includes(a.role),'A library editor imports sections',403)
   const sections:{title:string;blocks:any[]}[]=[];for(const part of parts){if(part.type==='heading'&&part.headingLevel===1)sections.push({title:part.title,blocks:[]});if(sections.length)sections.at(-1)!.blocks.push(part)}
   need(sections.length>0,'Library import needs Heading 1 sections')
   for(const section of sections){const content=section.blocks.map(b=>[b.title,b.text].filter(Boolean).join('\n')).join('\n\n');need(content.length<=10000,'Each library section must be at most 10000 characters');const id=crypto.randomUUID();writes.push(db.prepare('INSERT INTO p_library_items(id,title,kind,content,updated_by,updated_at) VALUES(?,?,?,?,?,?)').bind(id,section.title,'section',content,a.id,Date.now()))
    if(section.blocks.some(b=>['image','pricing','table'].includes(b.type))){writes.push(db.prepare('INSERT INTO p_imported_library(item_id,document,options) VALUES(?,?,?)').bind(id,JSON.stringify({version:1,blocks:section.blocks}),JSON.stringify(tables)));for(const b of section.blocks.filter(b=>b.type==='image'))writes.push(db.prepare('INSERT INTO p_library_media(item_id,file_id) VALUES(?,?)').bind(id,b.assetId))}
   }
   await commit(db,a,writes,false,{sql:"EXISTS(SELECT 1 FROM p_proposals WHERE id=? AND version=? AND status IN ('draft','approved'))",values:[row.id,original.version]});return {id:row.id,libraryItems:sections.length,report}
  }
  document.blocks.push(...parts);fields.pricingTables=tables
 }
 document.importReport=report
 // Media uses the existing private upload namespace; only placed assets become visible.
 if(writes.length)await commit(db,a,writes,false,{sql:"EXISTS(SELECT 1 FROM p_proposals WHERE id=? AND version=? AND status IN ('draft','approved'))",values:[row.id,original.version]})
 const result=await command(env,a,'proposal.revise',{...fields,id:row.id,version:original.version,document})
 if(data.get('mode')==='template')await command(env,a,'template.save',{id:row.id,version:result.version,name:String(data.get('templateName')||file.name.replace(/\.docx$/i,''))})
 return {...result,report}
}
export async function exportDocument(env:Bindings,a:Actor,id:string,format:string,optionId?:string,size='letter'){
 need(a.role!=='agent','A person exports proposal documents',403)
 const original=await permitted(env.DB,a,id),row=negotiatedView(original,await pendingNegotiation(env.DB,id)),view={...snapshot(row),clientName:(await env.DB.prepare('SELECT name FROM p_clients WHERE id=?').bind(row.client_id).first<any>())?.name}
 need(['pdf','docx'].includes(format),'Choose PDF or Word');need(['letter','a4'].includes(size),'Choose US Letter or A4')
 let bytes:Uint8Array,type:string
 if(format==='docx'){bytes=await writeWord(view,file=>mediaBytes(env.DB,row,file));type='application/vnd.openxmlformats-officedocument.wordprocessingml.document'}
 else{bytes=await offerPdf({...view,paperSize:size},optionId||view.options[0].id,await pdfFonts(env,row),[],file=>mediaBytes(env.DB,row,file));type='application/pdf'}
 return new Response(bytes.buffer as ArrayBuffer,{headers:{'content-type':type,'content-disposition':'attachment; filename="proposal-revision-'+row.revision+'.'+format+'"','cache-control':'no-store','x-content-type-options':'nosniff'}})
}
/** Preserve the original artifact separately; composed downloads mark every original page unsigned. */
export async function fixedPagesPdf(bytes:Uint8Array,generated:Uint8Array,view:any){
 const original=await PDFDocument.load(bytes),out=await PDFDocument.create(),font=await out.embedFont(StandardFonts.Helvetica)
 for(const page of await out.copyPages(original,original.getPageIndices())){out.addPage(page);page.drawText('Not signed, revision '+view.revision,{x:24,y:16,size:9,font,color:rgb(.25,.25,.25)})}
 for(const block of documentOf(view).blocks.filter(b=>b.page))if(block.type==='signature'||block.type==='field'){const page=out.getPage(block.page!-1);need((block.x??48)<page.getWidth()-20&&(block.y??100)<page.getHeight()-20,'Place fields inside their fixed page');page.drawText(block.title+(block.type==='signature'?' (not signed)':''),{x:block.x??48,y:block.y??100,size:12,font,color:rgb(.2,.2,.2)})}
 const appended=await PDFDocument.load(generated);for(const page of await out.copyPages(appended,appended.getPageIndices()))out.addPage(page)
 return out.save()
}
