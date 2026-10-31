import { canonicalJson, sha256, type Json, type SourceRecord } from '../../modules/import-kit/src/d1/index.ts'
import { parseBusinessCsv } from './business-csv'
import { ignitionExportColumns } from './business-presets'
import { fail } from './errors'

export type ExportProvider = 'generic' | 'qwilr' | 'ignition'
export type ExportMapping = Record<string, Record<string, string>>
type Csv = { name: string; source: string; bytes: Uint8Array }
type Document = { id: string; filename: string; title: string; client: string; date: string; signatureEvidence: unknown[] }
type Fact = { id: string; kind: string; sourceId: string; fields: Record<string,string>; sourceFields: Record<string,string>;
 sourceHash: string; sourceFile: string; sourceLine: number; bindings: Record<string,string|null>; execution: string }
export function exportMapping(value: unknown): ExportMapping {
 if (typeof value === 'string') { try { value=JSON.parse(value) } catch { fail('invalid_export_mapping',400,'Use a JSON column mapping') } }
 if (!value || typeof value!=='object' || Array.isArray(value)) fail('invalid_export_mapping',400)
 for (const [kind,columns] of Object.entries(value)) {
  if (!Object.hasOwn(ignitionExportColumns,kind) || !columns || typeof columns!=='object' || Array.isArray(columns)
   || Object.entries(columns).some(([key,header])=>!Object.hasOwn(ignitionExportColumns[kind as keyof typeof ignitionExportColumns],key)||typeof header!=='string'||!header)) fail('invalid_export_mapping',400,'Map supported source fields to exact column names')
 }
 return value as ExportMapping
}
export function exportedFacts(provider: ExportProvider, files: Csv[], documents: Document[], choices: Record<string,string>, supplied: ExportMapping, moveinId: string) {
 const mappings: ExportMapping={},facts: Fact[]=[],records: SourceRecord[]=[],issues: string[]=[],unmapped: string[]=[],usedChoices=new Set<string>()
 const bindings: { key:string; label:string; candidates:{id:string;label:string}[]; selected:string|null; reviewed:boolean }[]=[]
 const normalized=(text:string)=>text.trim().toLowerCase().replace(/\s+/g,' ')
 for (const file of files) {
  const stem=file.name.split('/').at(-1)!.replace(/\.csv$/i,'').toLowerCase().replace(/[ _-]/g,'')
  const kind=({clients:'clients',services:'services',proposals:'proposals',billingschedules:'billingSchedules'} as Record<string,string>)[stem]
  if (!kind || (provider==='qwilr'&&kind!=='proposals')) {unmapped.push(file.source+': unsupported export file');continue}
  const columns=supplied[kind]??(provider==='qwilr'?{id:'Page ID',title:'Title',clientId:'Client',date:'Date',status:'Status',currency:'Currency',value:'Value',document:'PDF'}:ignitionExportColumns[kind as keyof typeof ignitionExportColumns])
  mappings[kind]=columns
  const parsed=parseBusinessCsv(new TextDecoder().decode(file.bytes),','),sourceHash=sha256(file.bytes)
  const required=kind==='clients'?['id','name']:kind==='services'?['id','name','price','currency']:kind==='proposals'?['id','title','clientId','date','status','currency','document']:['id','proposalId','serviceId','status','date','currency','value','frequency']
  const missing=[...new Set([...required.filter(key=>!columns[key]),...Object.keys(columns).filter(key=>!parsed.headers.includes(columns[key]))])]
  if (missing.length) {issues.push(file.source+': map missing fields '+missing.join(', '));continue}
  for (const header of parsed.headers) if(!Object.values(columns).includes(header))unmapped.push(file.source+': retained unmapped column '+header)
  for (const row of parsed.rows) {
   const sourceFields=Object.fromEntries(parsed.headers.map((header,i)=>[header,row.cells[i]]))
   const fields=Object.fromEntries(Object.entries(columns).filter(([,header])=>parsed.headers.includes(header)).map(([key,header])=>[key,sourceFields[header]]))
   const sourceId=fields.id?.trim(),id=provider+':'+kind+':'+sourceId
   if(!sourceId||sourceId.length>200||/[\x00-\x1f]/.test(sourceId)) {issues.push(file.source+': row '+row.line+' needs a source ID');continue}
   if(facts.some(f=>f.id===id)) {issues.push(file.source+': duplicate source ID '+sourceId);continue}
   if((kind==='clients'||kind==='services')&&!fields.name?.trim())issues.push(file.source+': row '+row.line+' needs a name')
   facts.push({id,kind,sourceId,fields,sourceFields,sourceHash,sourceFile:file.source,sourceLine:row.line,bindings:{},execution:'source-evidence-only'})
  }
 }
 const bind=(fact:Fact,field:string,candidates:{id:string;label:string}[],exact?:string)=>{
  const key='binding:'+fact.id+':'+field,chosen=choices[key],reviewed=Object.hasOwn(choices,key)
  if(reviewed)usedChoices.add(key)
  if(reviewed&&chosen!=='unmapped'&&!candidates.some(c=>c.id===chosen))fail('invalid_export_binding',409,'Choose a currently offered source binding')
  const selected=reviewed?(chosen==='unmapped'?null:chosen):(exact??null)
  fact.bindings[field]=selected
  bindings.push({key,label:fact.kind+' '+fact.sourceId+' · '+field,candidates,selected,reviewed:reviewed||Boolean(exact)})
 }
 for(const fact of facts) {
  for(const [field,kind] of [['clientId','clients'],['proposalId','proposals'],['serviceId','services']]) {
   if(!Object.hasOwn(fact.fields,field))continue
   const candidates=facts.filter(f=>f.kind===kind).map(f=>({id:f.id,label:f.sourceId+' · '+(f.fields.name||f.fields.title||'')}))
   const exact=facts.find(f=>f.kind===kind&&f.sourceId===fact.fields[field])?.id
   // Qwilr reports may carry a client label without a separate client export.
   if(provider==='qwilr'&&field==='clientId')continue
   bind(fact,field,candidates,exact)
  }
  if(fact.kind==='proposals') {
   const named=documents.filter(d=>d.filename===fact.fields.document||d.filename.split('/').at(-1)===fact.fields.document)
   const candidates=documents.filter(d=>named.includes(d)||normalized(d.title)===normalized(fact.fields.title))
   // Title matches are suggestions; only a unique named file can bind without review.
   bind(fact,'document',candidates.map(d=>({id:d.id,label:d.filename+' · '+d.title})),named.length===1&&candidates.length===1?named[0].id:undefined)
  }
 }
 for(const fact of facts) {
  const value={...fact,moveinId,provider}
  const effects:any[]=[{targetKind:'source-facts',targetId:fact.id,value}]
  const common={id:fact.id,source_fields:fact.sourceFields,source_provider:provider,source_id:fact.sourceId,source_sha256:fact.sourceHash,version:1}
  if(fact.kind==='clients')effects.push({targetKind:'companies',targetId:fact.id,value:{...common,name:fact.fields.name}})
  if(fact.kind==='services')effects.push({targetKind:'catalog',targetId:fact.id,value:{...common,...fact.fields,id:fact.id,images:[],bundle_components:[],category_path:[],pricing_status:'retained-for-review'}})
  const payload={value,effects}
  // CSV originals are kept independently of the caller's ZIP bytes.
  records.push({namespace:'platter.exported-documents.v1',kind:'source-facts',sourceId:fact.id,payload:payload as unknown as Json,payloadHash:sha256(canonicalJson(payload)),artifactHash:fact.sourceHash,location:{artifact:'exports/'+fact.sourceHash+'.csv',row:fact.sourceLine}})
 }
 const held=bindings.filter(b=>!b.reviewed).length,omitted=bindings.filter(b=>b.reviewed&&!b.selected).length
 return {records,usedChoices,report:{provider,mappings,facts,bindings,issues,unmapped,counts:{clients:facts.filter(f=>f.kind==='clients').length,services:facts.filter(f=>f.kind==='services').length,proposals:facts.filter(f=>f.kind==='proposals').length,billingSchedules:facts.filter(f=>f.kind==='billingSchedules').length},held,omitted},canApply:!issues.length&&!held}
}
