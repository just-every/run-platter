import { Buffer } from 'node:buffer'
import { canonicalJson, sha256, type SourceBundle, type Json } from '../../modules/import-kit/src/d1/index.ts'
import { wordContent } from '../documents/word-content'
import { proposalFields } from '../commands'
import { variableNames } from '../variables'
import { snapshot, type Actor } from '../model'
import { businessSource } from './business-source'
import { fail } from './errors'
import { documentNamespace, type ExportedFile } from './document-source'
import type { NativeRow } from './document-native-targets'

export type FileRule={kind:'draft'|'template'|'library'|'catalog'|'contacts';clientId?:string;price?:string;format?:string;mapping?:Record<string,unknown>;omitUnfetchedImages?:boolean;shareConsent?:boolean}
export type MoveinMapping=Record<string,FileRule>
export function moveinMapping(input:Record<string,unknown>):MoveinMapping{
 let value=input.mapping??Object.fromEntries(Object.entries(input).filter(([key,v])=>key.startsWith('destination:')&&v).map(([key,kind])=>{
  const hash=key.slice(12),get=(name:string)=>input[name+':'+hash]
  let custom:any=get('columns');if(custom){try{custom=JSON.parse(String(custom))}catch{fail('invalid_mapping',400,'Use JSON for reviewed CSV columns')}}
  return [hash,{kind,...(get('client')?{clientId:String(get('client'))}:{}),...(get('price')?{price:String(get('price'))}:{}),...(get('format')?{format:String(get('format'))}:{}),...(custom?{mapping:custom}:{}),...(get('share')==='yes'?{shareConsent:true}:{}),...(get('without-images')==='yes'?{omitUnfetchedImages:true}:{})}]
 }))
 if(typeof value==='string'){try{value=JSON.parse(value)}catch{fail('invalid_mapping',400,'Review the file destinations again')}}
 if(!value||typeof value!=='object'||Array.isArray(value))fail('invalid_mapping',400)
 const rules=value as MoveinMapping
 for(const [hash,rule]of Object.entries(rules))if(!/^[a-f0-9]{64}$/.test(hash)||!rule||typeof rule!=='object'||!['draft','template','library','catalog','contacts'].includes(rule.kind)||Object.keys(rule).some(k=>!['kind','clientId','price','format','mapping','omitUnfetchedImages','shareConsent'].includes(k)))fail('invalid_mapping',400,'Choose a supported destination for each exact file')
 return rules
}
const row=(table:string,key:NativeRow['key'],values:NativeRow['values']):NativeRow=>({table,key,values})
export async function nativeDocumentSource(db:D1Database,actor:Actor,movein:{id:string;created_at:number},source:SourceBundle,files:ExportedFile[],documents:any[],rules:MoveinMapping){
 const additions:SourceBundle['records']=[],resources:any[]=[],diagnostics=source.diagnostics,at=movein.created_at
 const id=(...parts:string[])=>'movein-'+sha256(canonicalJson([movein.id,...parts])).slice(0,48)
 const add=(sourceId:string,rows:NativeRow[],artifactHash:string)=>{
  const value={rows},payload={value,targetKind:'native'}
  additions.push({namespace:documentNamespace,kind:'native',sourceId:rows[0].table+':'+sourceId,payload:payload as unknown as Json,payloadHash:sha256(canonicalJson(payload)),artifactHash:sha256(canonicalJson(rules)),location:{artifact:'reviewed-file-destinations.json'}})
 }
 const folders=new Map<string,string>()
 const folder=(path:string)=>{
  if(!path)return null
  let parent:string|null=null,prefix=''
  for(const part of path.split('/')){prefix+=(prefix?'/':'')+part;if(!folders.has(prefix)){const folderId=id('folder',prefix);folders.set(prefix,folderId);add(folderId,[row('p_proposal_folders',{id:folderId},{id:folderId,name:prefix.slice(0,100),parent_id:parent,version:1,updated_by:actor.id,updated_at:at})],sha256(prefix))}parent=folders.get(prefix)!}
  return parent
 }
 const catalog=[...(await db.prepare('SELECT id,sku,name FROM p_priced_catalog').all<any>()).results,...(await db.prepare('SELECT data_json FROM p_catalog_items').all<{data_json:string}>()).results.map(r=>JSON.parse(r.data_json))]
 // Business parents precede document resources and are undone after their users.
 const business:SourceBundle['records']=[],seen=new Set<string>()
 for(const file of files){const rule=rules[file.sha256];if(!rule||!['catalog','contacts'].includes(rule.kind)||seen.has(file.sha256))continue;seen.add(file.sha256)
  if(!/\.csv$/i.test(file.filename))fail('invalid_mapping',400,'Contacts and catalog destinations require CSV files')
  const parsed=businessSource({kind:rule.kind,format:rule.format??'platter',mapping:rule.mapping,csv:Buffer.from(file.bytes).toString('utf8')},{allowUnfetched:rule.omitUnfetchedImages===true})
  for(const a of parsed.source.artifacts)source.artifacts.push({...a,name:'business/'+file.sha256+'/'+a.name})
  diagnostics.push(...parsed.source.diagnostics)
  for(const record of parsed.source.records){const value={...(record.payload as any).value,version:1},payload={value,targetKind:record.kind};business.push({...record,namespace:documentNamespace,kind:record.kind,sourceId:value.id,payload:payload as Json,payloadHash:sha256(canonicalJson(payload)),location:{...record.location,artifact:'business/'+file.sha256+'/'+record.location.artifact}});if(record.kind==='catalog')catalog.push(value)}
  resources.push({id:file.sha256,kind:rule.kind,filename:file.filename,count:parsed.source.records.length})
 }
 seen.clear()
 for(const file of files){const rule=rules[file.sha256];if(!rule||['catalog','contacts'].includes(rule.kind)||seen.has(file.sha256))continue;seen.add(file.sha256)
  const pdf=documents.find(d=>d.sha256===file.sha256),isPdf=/\.pdf$/i.test(file.filename)
  if(rule.kind==='draft'&&isPdf&&(!pdf||pdf.signatureEvidence.length))fail('invalid_mapping',409,'Signed originals remain retained; choose an unsigned document for a new draft')
  if(!isPdf&&!/\.docx$/i.test(file.filename))fail('invalid_mapping',400,'Editable imports require a Word document')
  if(rule.kind==='library'&&isPdf)fail('invalid_mapping',400,'Library conversion needs the Word download; retain PDF-only sections for rebuilding')
  if(rule.kind==='library'&&rule.shareConsent!==true)fail('sharing_consent_required',409,'Explicitly authorize making imported library sections available to all library readers')
  const nativeId=id(file.sha256,rule.kind),mediaIds:string[]=[]
  let serial=0
  const retain=async(name:string,type:string,bytes:Uint8Array)=>{
   const mediaId=id(file.sha256,'media',String(serial++))
   add(mediaId,[row('p_attachment_files',{id:mediaId},{id:mediaId,filename:name,media_type:type,size:bytes.length,sha256:sha256(bytes),created_at:at})],file.sha256)
   for(let offset=0,part=0;offset<bytes.length;offset+=48000,part++)add(mediaId+'-'+part,[row('p_attachment_chunks',{file_id:mediaId,part},{file_id:mediaId,part,bytes_base64:Buffer.from(bytes.subarray(offset,offset+48000)).toString('base64')})],file.sha256)
   mediaIds.push(mediaId);return mediaId
  }
  const converted=isPdf?null:await wordContent(file.bytes,catalog,'one',retain,()=>id(file.sha256,'block',String(serial++)))
  const document:any={version:1,blocks:converted?.parts??[],importReport:converted?.report??{unknown:[],unmatched:[],missing:['Word download needed for editing']}}
  if(isPdf)document.fixedPdf={fileId:await retain(file.filename.split('/').at(-1)!,'application/pdf',file.bytes),pages:pdf.pages}
  const title=pdf?.title??file.filename.split('/').at(-1)!.replace(/\.docx$/i,''),scope=converted?.parts.filter(p=>p.type==='text').map(p=>p.text).join('\n\n').slice(0,10000)||'Review the imported document before approving and sending a new offer.'
  if(rule.kind==='library'){
   const sections:{title:string;blocks:any[]}[]=[]
   for(const b of document.blocks){if(b.type==='heading'&&b.headingLevel===1)sections.push({title:b.title,blocks:[]});if(sections.length)sections.at(-1)!.blocks.push(b)}
   if(!sections.length)fail('invalid_mapping',400,'Library Word files need Heading 1 sections')
   for(const [index,section]of sections.entries()){
    const itemId=id(file.sha256,'library',String(index)),content=section.blocks.map(b=>[b.title,b.text].filter(Boolean).join('\n')).join('\n\n');if(content.length>10000)fail('invalid_mapping',400,'Each library section must fit 10000 characters')
    const rows=[row('p_library_items',{id:itemId},{id:itemId,title:section.title,kind:'section',content,version:1,updated_by:actor.id,updated_at:at}),row('p_imported_library',{item_id:itemId},{item_id:itemId,document:JSON.stringify({version:1,blocks:section.blocks}),options:JSON.stringify(converted!.tables)})]
    for(const b of section.blocks.filter(b=>b.type==='image'))rows.push(row('p_library_media',{item_id:itemId,file_id:b.assetId},{item_id:itemId,file_id:b.assetId}))
    add(itemId,rows,file.sha256);resources.push({id:itemId,kind:'library',title:section.title,filename:file.filename})
   }
   continue
  }
  const clientId=rule.kind==='draft'?String(rule.clientId??''):'template-client'
  if(rule.kind==='draft'&&!await db.prepare('SELECT 1 FROM p_clients WHERE id=?').bind(clientId).first())fail('invalid_mapping',409,'Choose an existing client for each open-document draft')
  const fields=proposalFields({clientId,title,scope,depositPercent:'100',packages:[{id:'one',label:'Imported offer',price:rule.price}],pricingTables:converted?.tables??[],document})
  // Preserve variable patterns for the template's normal destination-client refill.
  const patterns:Record<string,string>={}
  const walk=(value:any,path:string)=>{if(typeof value==='string'&&variableNames(value).length)patterns[path]=value;else if(Array.isArray(value))value.forEach((v,i)=>walk(v,path+'/'+i));else if(value&&typeof value==='object')for(const [k,v]of Object.entries(value))walk(v,path+'/'+k)}
  walk(fields.document,'/document');walk(fields.scope,'/scope');if(Object.keys(patterns).length)fields.document.merge={patterns,values:{}}
  const content={...fields,currency:'USD',revision:1,id:nativeId,attachments:[]},rows:NativeRow[]=[]
  if(rule.kind==='draft'){
   const folderId=folder(file.filename.split('/').slice(0,-1).join('/'))
   rows.push(row('p_proposals',{id:nativeId},{id:nativeId,client_id:clientId,title,scope:fields.scope,terms:fields.terms,version:1,revision:1,status:'draft',deposit_bps:fields.deposit_bps,options:JSON.stringify(fields.options),document:JSON.stringify(fields.document),prepared_by:actor.email,created_at:at,currency:'USD',sales_owner_id:actor.id,sales_owner_name:actor.email}),
    row('p_revisions',{proposal_id:nativeId,revision:1},{proposal_id:nativeId,revision:1,snapshot:JSON.stringify(snapshot(content)),prepared_by:actor.email,prepared_at:at,currency:'USD'}),row('p_pdf_settings',{proposal_id:nativeId},{proposal_id:nativeId,enabled:1}))
   if(folderId)rows.push(row('p_proposal_filing',{proposal_id:nativeId},{proposal_id:nativeId,folder_id:folderId,version:1}))
   if(isPdf)rows.push(row('p_imported_document_links',{document_id:file.sha256,proposal_id:nativeId},{document_id:file.sha256,proposal_id:nativeId}))
  }else{
   const {id:_,client_id:__,revision:___,...template}=snapshot(content)
   rows.push(row('p_personal_templates',{id:nativeId},{id:nativeId,owner_id:actor.id,name:title,version:1,snapshot:JSON.stringify(template),pdf_enabled:1,expiry:JSON.stringify({mode:'never',period_days:null,expires_on:null,time_zone:'UTC',warning_days:null}),suggestion_sections:'[]',created_at:at,updated_at:at,shared:0}))
  }
  for(const mediaId of mediaIds){const table=rule.kind==='draft'?'p_document_media':'p_template_document_media',key=rule.kind==='draft'?'proposal_id':'template_id';rows.push(row(table,{[key]:nativeId,file_id:mediaId},{[key]:nativeId,file_id:mediaId}))}
  add(nativeId,rows,file.sha256);resources.push({id:nativeId,kind:rule.kind,title,filename:file.filename,report:document.importReport})
 }
 if(Object.keys(rules).some(hash=>!files.some(f=>f.sha256===hash)))fail('invalid_mapping',409,'Review only files present in this move-in')
 source.records.push(...business,...additions)
 return resources
}
