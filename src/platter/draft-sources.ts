import { commit, hash, need, text, type Actor } from './model'
import { documentOf, proposalDocument } from './documents/blocks'
import { proposalFields } from './commands'

const linesOf = (original: string) => original.split(/\r\n|\n|\r/)
const owner = (a: Actor) => need(a.role === 'owner', 'Only the owner inspects or binds source originals', 403)
const consentGuard = (a: Actor, sourceId: string, version: number) => ({
 sql: 'EXISTS(SELECT 1 FROM p_draft_sources s JOIN p_draft_source_consent c ON c.source_id=s.id AND c.source_version=s.version WHERE s.id=? AND s.owner_id=? AND s.version=? AND c.key_id=?)',
 values: [sourceId, a.id, version, a.keyId!],
})
export async function draftSourceState(db: D1Database, a: Actor) {
 if (!['owner', 'agent'].includes(a.role)) return { draftSources: [], draftSourceConsent: [], draftProvenance: [] }
 const sources = (await db.prepare('SELECT s.id,s.version,v.title,v.sha256,v.line_count AS lineCount,v.created_at AS createdAt FROM p_draft_sources s JOIN p_draft_source_versions v ON v.source_id=s.id AND v.version=s.version WHERE s.owner_id=?' + (a.role === 'agent' ? ' AND EXISTS(SELECT 1 FROM p_draft_source_consent c WHERE c.source_id=s.id AND c.source_version=s.version AND c.key_id=?)' : '') + ' ORDER BY v.created_at DESC,s.id').bind(a.id, ...(a.role === 'agent' ? [a.keyId!] : [])).all<any>()).results
 const provenance = (await db.prepare('SELECT d.* FROM p_draft_provenance d JOIN p_proposals p ON p.id=d.proposal_id WHERE p.sales_owner_id=?').bind(a.id).all<any>()).results
 return { sourcedCatalog: a.role==='agent'?(await db.prepare("SELECT id,version,sku,name,description,unit,unit_cents AS unitCents FROM p_priced_catalog WHERE default_recurrence='one-off' AND taxable=0 ORDER BY name,id").all()).results:[], draftSources: sources, draftSourceConsent: a.role === 'owner' ? (await db.prepare('SELECT c.* FROM p_draft_source_consent c JOIN p_agent_keys k ON k.id=c.key_id WHERE k.owner_id=?').bind(a.id).all()).results : [], draftProvenance: provenance.map(({references_json,catalog_json,...row}) => ({...row,sections:JSON.parse(references_json),catalog:JSON.parse(catalog_json)})) }
}
export async function sourceOriginal(db: D1Database, a: Actor, id: string, version?: string | null) {
 owner(a)
 const row = await db.prepare('SELECT v.* FROM p_draft_source_versions v JOIN p_draft_sources s ON s.id=v.source_id WHERE s.id=? AND s.owner_id=? AND v.version=COALESCE(?,s.version)').bind(id,a.id,version ? Number(version) : null).first<any>()
 need(row, 'Source version not found', 404)
 return {...row,lines:linesOf(row.original).map((value,index)=>({line:index+1,text:value}))}
}
export async function draftSourceCommand(db: D1Database, a: Actor, name: string, p: Record<string,unknown>) {
 owner(a)
 if (name === 'draft-source.upload') {
  need(typeof p.original === 'string' && p.original.trim() && new TextEncoder().encode(p.original).length <= 64000 && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(p.original), 'Upload plain text notes up to 64 KB')
  const title=text(p.title,'a source title'),id=p.id ? text(p.id,'a source') : crypto.randomUUID()
  const old=p.id ? await db.prepare('SELECT * FROM p_draft_sources WHERE id=? AND owner_id=?').bind(id,a.id).first<any>() : null
  if(p.id)need(old && old.version===Number(p.version),'Source changed. Reload before uploading a new version.',409)
  const version=(old?.version??0)+1,sha256=await hash(p.original),lineCount=linesOf(p.original).length
  await commit(db,a,[old ? db.prepare('UPDATE p_draft_sources SET version=? WHERE id=?').bind(version,id) : db.prepare('INSERT INTO p_draft_sources(id,owner_id,version) VALUES(?,?,?)').bind(id,a.id,version),db.prepare('INSERT INTO p_draft_source_versions(source_id,version,title,original,sha256,line_count,created_at) VALUES(?,?,?,?,?,?,?)').bind(id,version,title,p.original,sha256,lineCount,Date.now())],true,old ? {sql:'EXISTS(SELECT 1 FROM p_draft_sources WHERE id=? AND owner_id=? AND version=?)',values:[id,a.id,old.version]} : undefined)
  return {id,version,sha256,lineCount}
 }
 need(name==='draft-source.consent','Unknown source command',404)
 const keyId=text(p.keyId,'an agent key'),sourceId=text(p.sourceId,'a source'),version=Number(p.sourceVersion)
 const key=await db.prepare("SELECT k.id FROM p_agent_keys k JOIN oa_operators o ON o.id=k.owner_id WHERE k.id=? AND k.owner_id=? AND k.revoked_at IS NULL AND k.expires_at>? AND o.version=k.owner_version AND o.status='active' AND o.role='owner'").bind(keyId,a.id,Date.now()).first()
 need(key,'Current owner-bound key required',409)
 const grant=p.consent===true||p.consent==='yes'
 need(grant || p.consent===false || p.consent==='no','Explicit source-binding consent is required')
 const source=await db.prepare('SELECT 1 FROM p_draft_sources WHERE id=? AND owner_id=? AND version=?').bind(sourceId,a.id,version).first()
 need(source,'Select the current source version',409)
 await commit(db,a,[db.prepare('DELETE FROM p_draft_source_consent WHERE key_id=? AND source_id=?').bind(keyId,sourceId),...(grant ? [db.prepare('INSERT INTO p_draft_source_consent(key_id,source_id,source_version,consented_at) VALUES(?,?,?,?)').bind(keyId,sourceId,version,Date.now())] : [])],true,{sql:'EXISTS(SELECT 1 FROM p_draft_sources WHERE id=? AND owner_id=? AND version=?) AND EXISTS(SELECT 1 FROM p_agent_keys WHERE id=? AND revoked_at IS NULL AND expires_at>?)',values:[sourceId,a.id,version,keyId,Date.now()]})
 return {saved:true,active:grant,id:sourceId+':'+version+':'+keyId+':'+(grant?'allow':'revoke')}
}
const data = (v:any,keys:string[]) => need(v && typeof v==='object' && !Array.isArray(v) && Object.keys(v).every(k=>keys.includes(k)), 'Unsupported prepared content; review it outside this action')
export async function sourcedPreparation(db: D1Database, a: Actor, input: Record<string,unknown>, content:any) {
 need(a.role==='agent'&&a.keyId,'A consented agent key prepares sourced content',403)
 need(['scope','packages','pricingTables','depositPercent','optionOne','priceOne','optionTwo','priceTwo'].every(key=>input[key]===undefined),'Use only sourced sections and selected catalog rows for this preparation')
 const p=input.sourceDraft as any
 data(p,['sourceId','sourceVersion','sourceSha256','sections','packages'])
 const sourceId=text(p.sourceId,'a source'),source=await db.prepare('SELECT v.* FROM p_draft_sources s JOIN p_draft_source_versions v ON v.source_id=s.id AND v.version=s.version WHERE s.id=? AND s.owner_id=? AND s.version=?').bind(sourceId,a.id,Number(p.sourceVersion)).first<any>()
 need(source && source.sha256===p.sourceSha256,'Select the current exact source version',409)
 const guard=consentGuard(a,sourceId,source.version)
 need(await db.prepare('SELECT 1 WHERE '+guard.sql).bind(...guard.values).first(),'This key has no consent for the selected source version',403)
 need(!documentOf(content).fixedPdf && !documentOf(content).merge && !(content.recipient_plan?.length) && !content.payment_terms,'Choose an ordinary native single-client template without unresolved variables or payment schedules',409)
 need(Array.isArray(p.sections)&&p.sections.length>0&&p.sections.length<=30,'Provide cited scope sections')
 const sourceLines=linesOf(source.original),references:any[]=[],blocks:any[]=[]
 for(const section of p.sections){
  data(section,['id','title','text','citation']);data(section.citation,['startLine','endLine','sha256'])
  const {startLine,endLine,sha256}=section.citation
  need(Number.isInteger(startLine)&&Number.isInteger(endLine)&&startLine>=1&&endLine>=startLine&&endLine<=sourceLines.length,'Citation is outside the selected source lines',409)
  need(await hash(sourceLines.slice(startLine-1,endLine).join('\n'))===sha256,'Citation does not match the selected source lines',409)
  const id=text(section.id,'a section id',80),title=text(section.title,'a section title'),written=text(section.text,'section text',10000)
  blocks.push({id,type:'text',title,text:written});references.push({sectionId:id,sourceId,sourceVersion:source.version,sourceSha256:source.sha256,startLine,endLine,sha256})
 }
 need(Array.isArray(p.packages)&&p.packages.length>0&&p.packages.length<=10,'Provide catalog-priced packages')
 const catalog:any[]=[],tables:any[]=[],packages:any[]=[],checks:string[]=[],values:any[]=[]
 for(const pkg of p.packages){
  data(pkg,['id','label','lines']);need(Array.isArray(pkg.lines)&&pkg.lines.length>0&&pkg.lines.length<=50,'Every package needs matched catalog items')
  const id=text(pkg.id,'a package id',80),label=text(pkg.label,'a package name'),lines:any[]=[]
  for(const requested of pkg.lines){
   data(requested,['catalogId','catalogVersion','quantity'])
   const item=await db.prepare('SELECT * FROM p_priced_catalog WHERE id=? AND version=?').bind(text(requested.catalogId,'a catalog item'),Number(requested.catalogVersion)).first<any>()
   need(item,'Catalog item is unmatched or its selected version changed',409)
   need(item.default_recurrence==='one-off'&&!item.taxable,'Sourced drafting currently holds recurring and taxed catalog items',409)
   const quantity=String(requested.quantity??'');need(/^\d+(?:\.\d{1,3})?$/.test(quantity)&&Number(quantity)>0&&Number(quantity)<=1000000,'Choose an explicit positive catalog quantity')
   lines.push({catalogId:item.id,name:item.name,description:item.description,unit:item.unit,unitPrice:(item.unit_cents/100).toFixed(2),quantity,incomeAccount:item.income_account})
   catalog.push({packageId:id,catalogId:item.id,catalogVersion:item.version,quantity,unitCents:item.unit_cents})
   checks.push('EXISTS(SELECT 1 FROM p_priced_catalog WHERE id=? AND version=?)');values.push(item.id,item.version)
  }
  packages.push({id,label,price:'1'});tables.push({optionId:id,name:label,lines})
 }
 const scope=blocks.map(b=>b.title+'\n'+b.text).join('\n\n')
 const fields=proposalFields({clientId:input.clientId,title:input.title??content.title,scope,terms:content.terms??'',depositPercent:content.deposit_bps/100,packages,pricingTables:tables,document:proposalDocument({...documentOf(content),blocks:[...documentOf(content).blocks,...blocks]})})
 const next={...content,...fields,recipient_plan:[],payment_terms:null,section_conditions:{}}
 const fullGuard={sql:guard.sql+' AND '+checks.join(' AND '),values:[...guard.values,...values]}
 return {content:next,guard:fullGuard,writes:(id:string)=>[db.prepare('INSERT INTO p_draft_provenance(proposal_id,revision,source_id,source_version,source_sha256,references_json,catalog_json,key_id,prepared_at) VALUES(?,1,?,?,?,?,?,?,?)').bind(id,sourceId,source.version,source.sha256,JSON.stringify(references),JSON.stringify(catalog),a.keyId!,Date.now())]}
}
