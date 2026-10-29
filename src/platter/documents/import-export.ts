import fontkit from '@pdf-lib/fontkit'
import { document as htmlDocument } from '../ui/shell'
import { escape } from '../ui/shared'
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
import { writeWord } from './word'
import { wordContent } from './word-content'

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
  const catalog=[...(await db.prepare('SELECT id,sku,name FROM p_priced_catalog').all<any>()).results,...(await db.prepare('SELECT id,data_json FROM p_catalog_items').all<any>()).results.map(r=>({id:r.id,...JSON.parse(r.data_json)}))]
  const tables=fields.pricingTables,optionId=String(data.get('optionId')??fields.packages[0].id),option=fields.packages.find((o:any)=>o.id===optionId);need(option,'Choose an offered package')
  const converted=await wordContent(bytes,catalog,optionId,retain,undefined,tables.filter((t:any)=>t.optionId===optionId).length),parts=converted.parts
  tables.push(...converted.tables);Object.assign(report,converted.report)
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
export async function exportDocument(env:Bindings,a:Actor,id:string,format:string,optionId?:string,size='letter',rendered?:Record<string,any>){
 need(a.role!=='agent','A person exports proposal documents',403)
 const original=await permitted(env.DB,a,id),row=negotiatedView(original,await pendingNegotiation(env.DB,id)),view={...snapshot(row),clientName:(await env.DB.prepare('SELECT name FROM p_clients WHERE id=?').bind(row.client_id).first<any>())?.name}
 need(['pdf','docx'].includes(format),'Choose PDF or Word');need(['letter','a4'].includes(size),'Choose US Letter or A4')
 let bytes:Uint8Array,type:string
 if(format==='docx'){
  const fixed=documentOf(row).fixedPdf,images:Uint8Array[]=[]
  if(fixed){
   const file=await env.DB.prepare('SELECT sha256 FROM p_attachment_files WHERE id=?').bind(fixed.fileId).first<any>();need(file,'Fixed PDF not found',404)
   if(!rendered)return htmlDocument('Export fixed pages to Word','<section class="panel" data-fixed-word-export data-source="/api/platter/document-media/'+escape(row.id)+'/'+escape(fixed.fileId)+'" data-id="'+escape(row.id)+'" data-sha="'+escape(file.sha256)+'"><h1>Preparing Word document</h1><p role="status">Rendering the original fixed pages in this browser. Keep this page open until the download is ready.</p><a href="/app/proposal?id='+escape(row.id)+'">Return to proposal</a></section><script type="module" src="/fixed-pages.js"></script>',{actor:a,path:'/app'})
   need(rendered.sha256===file.sha256&&Array.isArray(rendered.images)&&rendered.images.length===fixed.pages,'The source PDF changed. Start this export again.',409)
   let total=0
   for(const encoded of rendered.images){need(typeof encoded==='string'&&/^[A-Za-z0-9+/]*={0,2}$/.test(encoded),'Provide rendered PNG pages');const bytes=Uint8Array.from(atob(encoded),c=>c.charCodeAt(0));total+=bytes.length;need(total<=20*1024*1024,'Rendered pages exceed the 20 MiB export limit',413);const probe=await PDFDocument.create();try{const image=await probe.embedPng(bytes);need(image.width*image.height<=16000000,'Rendered page dimensions are too large')}catch{need(false,'A rendered page is not a readable PNG')}images.push(bytes)}
  }
  bytes=await writeWord(view,file=>mediaBytes(env.DB,row,file),images);type='application/vnd.openxmlformats-officedocument.wordprocessingml.document'}
 else{bytes=await offerPdf({...view,paperSize:size},optionId||view.options[0].id,await pdfFonts(env,row),[],file=>mediaBytes(env.DB,row,file));type='application/pdf'}
 return new Response(bytes.buffer as ArrayBuffer,{headers:{'content-type':type,'content-disposition':'attachment; filename="proposal-revision-'+row.revision+'.'+format+'"','cache-control':'no-store','x-content-type-options':'nosniff'}})
}
/** Preserve the original artifact separately; composed downloads mark every original page unsigned. */
export async function fixedPagesPdf(bytes:Uint8Array,generated:Uint8Array,view:any,signed=false,fontBytes:(Uint8Array|ArrayBuffer)[]=[]){
 const original=await PDFDocument.load(bytes),out=await PDFDocument.create();out.registerFontkit(fontkit)
 const fonts=fontBytes.length?await Promise.all(fontBytes.map(bytes=>out.embedFont(bytes,{subset:true}))):[await out.embedFont(StandardFonts.Helvetica)],coverage=fonts.map(font=>new Set(font.getCharacterSet())),segmenter=new Intl.Segmenter(undefined,{granularity:'grapheme'})
 const draw=(page:any,text:string,x:number,y:number,size:number)=>{const complete=coverage.findIndex(set=>Array.from(text,c=>c.codePointAt(0)!).every(point=>set.has(point)));if(complete>=0){page.drawText(text,{x,y,size,font:fonts[complete],color:rgb(.2,.2,.2)});return}const runs:{index:number;text:string}[]=[];for(const {segment}of segmenter.segment(text)){const index=coverage.findIndex(set=>Array.from(segment,c=>c.codePointAt(0)!).every(point=>set.has(point)));need(index>=0,'A fixed-page field needs a font covering its text',422);const last=runs.at(-1);if(last?.index===index)last.text+=segment;else runs.push({index,text:segment})}for(const run of runs){const font=fonts[run.index];page.drawText(run.text,{x,y,size,font,color:rgb(.2,.2,.2)});x+=font.widthOfTextAtSize(run.text,size)}}
 const size:[number,number]=view.paperSize==='a4'?[595.28,841.89]:[612,792],geometry:{scale:number;x:number;y:number}[]=[]
 for(const page of original.getPages())page.pushOperators()
 const embedded=await out.embedPages(original.getPages())
 for(const source of embedded){const page=out.addPage(size),scale=Math.min(size[0]/source.width,(size[1]-32)/source.height),x=(size[0]-source.width*scale)/2,y=32+(size[1]-32-source.height*scale)/2;geometry.push({scale,x,y});page.drawPage(source,{x,y,xScale:scale,yScale:scale});draw(page,(signed?'Signed agreement':'Not signed')+', revision '+view.revision,24,16,9)}
 for(const block of documentOf(view).blocks.filter(b=>b.page))if(block.type==='signature'||block.type==='field'){const page=out.getPage(block.page!-1),source=original.getPage(block.page!-1),position=geometry[block.page!-1];need((block.x??48)<source.getWidth()-20&&(block.y??100)<source.getHeight()-20,'Place fields inside their fixed page');const value=view.fieldValues?.[block.id];draw(page,signed&&value!==undefined?block.title+': '+String(value):block.title+(block.type==='signature'&&!signed?' (not signed)':''),position.x+(block.x??48)*position.scale,position.y+(block.y??100)*position.scale,12*position.scale)}
 const appended=await PDFDocument.load(generated);for(const page of await out.copyPages(appended,appended.getPageIndices()))out.addPage(page)
 return out.save()
}

export async function fixedPagePreview(env:Bindings,row:any,verified=false){
 const db=env.DB
 const fixed=documentOf(row).fixedPdf;need(fixed,'Fixed PDF not found',404)
 const accepted=row.status==='accepted'?await db.prepare('SELECT snapshot FROM p_acceptances WHERE proposal_id=? AND revision=?').bind(row.id,row.revision).first<any>():null
 const view=accepted&&verified?{...row,fieldValues:JSON.parse(accepted.snapshot).fieldValues}:row
 const empty=await PDFDocument.create(),bytes=await fixedPagesPdf(await mediaBytes(db,row,fixed.fileId),await empty.save({addDefaultPage:false}),view,Boolean(accepted),await pdfFonts(env,row))
 return new Response(bytes.buffer as ArrayBuffer,{headers:{'content-type':'application/pdf','content-disposition':'inline; filename="fixed-pages-revision-'+row.revision+'.pdf"','cache-control':'no-store','x-content-type-options':'nosniff'}})
}
