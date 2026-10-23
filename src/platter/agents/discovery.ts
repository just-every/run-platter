import { need, text, type Actor } from '../model'

// Deliberately literal matching: this door validates an external agent's package
// choices against supplied source lines and current catalog prices. It does not
// infer facts, transcribe recordings, or claim to have run a language model.
export async function discoveryDraft(db:D1Database,a:Actor,p:Record<string,unknown>){
 need(Object.keys(p).every(k=>['clientId','title','depositPercent','sources','packages'].includes(k)),'Unknown discovery field')
 need(a.role==='agent'&&a.keyId,'An authorized agent prepares a discovery draft',403)
 need(await db.prepare('SELECT id FROM p_agent_keys WHERE id=? AND discovery_consent_at IS NOT NULL').bind(a.keyId).first(),'The owner must consent to retained discovery sources for this key',403)
 need(Array.isArray(p.sources)&&p.sources.length>=2&&p.sources.length<=10,'Provide two to ten sources')
 const ids=new Set<string>(),sources=p.sources.map((source:any)=>{
  need(source&&typeof source==='object'&&['transcript','email','crm-note','winning-proposal'].includes(source.kind),'Choose a supported source kind')
  const id=text(source.id,'a source identifier',40);need(/^[a-zA-Z0-9_-]+$/.test(id)&&!ids.has(id),'Use distinct source identifiers');ids.add(id)
  text(source.text,'source text',10000)
  return {id,kind:source.kind,text:source.text as string}
 })
 need(sources.some(s=>s.kind==='transcript')&&sources.some(s=>s.kind==='email'),'Include a transcript and an email source')
 need(sources.reduce((n,s)=>n+s.text.length,0)<=20000,'Use at most 20000 source characters')
 const catalog=(await db.prepare('SELECT id,sku,name,description,unit,unit_cents,version FROM p_priced_catalog ORDER BY id').all<any>()).results
 const includes=(line:string,label:string)=>new RegExp('(?<![\\p{L}\\p{N}])'+label.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'(?![\\p{L}\\p{N}])','iu').test(line)
 const citations=sources.flatMap(s=>s.text.split(/\r?\n/).flatMap((written:string,index:number)=>{
  const quote=written.trim();if(!/^(requirement|assumption|exclusion):/i.test(quote))return []
  const kind=/^assumption:/i.test(quote)?'assumption':/^exclusion:/i.test(quote)?'exclusion':'requirement'
  return [{sourceId:s.id,line:index+1,kind,quote,catalogIds:kind==='requirement'?catalog.filter(item=>includes(quote,item.sku)||includes(quote,item.name)).map(item=>item.id):[]}]
 }))
 need(citations.length>0&&citations.length<=100,'Use one to one hundred nonempty source lines')
 const unmatched=citations.filter(c=>c.kind==='requirement'&&!c.catalogIds.length)
 need(Array.isArray(p.packages)&&p.packages.length>=2&&p.packages.length<=3,'Choose two or three packages')
 const packageIds=new Set<string>(),selected=new Map<string,any>()
 const pricingTables=p.packages.map((pack:any)=>{
  need(pack&&typeof pack==='object','Provide a package')
  const id=text(pack.id,'a package identifier',40);need(/^[a-zA-Z0-9_-]+$/.test(id)&&!packageIds.has(id),'Use distinct package identifiers');packageIds.add(id)
  need(Array.isArray(pack.catalogIds)&&pack.catalogIds.length>0&&pack.catalogIds.length<=20&&new Set(pack.catalogIds).size===pack.catalogIds.length,'Choose distinct catalog items for each package')
  return {optionId:id,name:text(pack.label,'a package label'),lines:pack.catalogIds.map((catalogId:unknown)=>{
   const item=catalog.find(c=>c.id===catalogId),citation=citations.find(c=>c.catalogIds.includes(catalogId as string));need(item&&citation,'Every package item must match a requirement source and the catalog',409);selected.set(item.id,item)
   return {name:item.name,description:'Source '+citation.sourceId+':'+citation.line,quantity:'1',unit:item.unit,unitPrice:(item.unit_cents/100).toFixed(2)}
  })}
 })
 const scope=citations.map(c=>`${c.quote} [${c.sourceId}:${c.line}]${c.kind==='requirement'&&!c.catalogIds.length?' (Unmatched request)':''}`).join('\n')
 need(scope.length<=10000,'Use shorter sources for the proposal scope')
 const rows=[...selected.values()],at=Date.now()
 return {fields:{clientId:p.clientId,title:p.title,scope,depositPercent:p.depositPercent,packages:pricingTables.map(t=>({id:t.optionId,label:t.name})),pricingTables},citations,unmatched,
  custody:{guard:{sql:'EXISTS(SELECT 1 FROM p_agent_keys WHERE id=? AND discovery_consent_at IS NOT NULL) AND '+rows.map(()=> 'EXISTS(SELECT 1 FROM p_priced_catalog WHERE id=? AND version=?)').join(' AND '),values:[a.keyId,...rows.flatMap(r=>[r.id,r.version])]},writes:(id:string,revision:number)=>[db.prepare('INSERT INTO p_discovery_drafts(proposal_id,revision,sources,citations,unmatched,catalog_snapshot,created_at) VALUES(?,?,?,?,?,?,?)').bind(id,revision,JSON.stringify(sources),JSON.stringify(citations),JSON.stringify(unmatched),JSON.stringify(rows),at)]}}
}
export async function readDiscovery(db:D1Database,a:Actor,p:Record<string,unknown>){
 need(a.role==='owner','Only the owner reads retained discovery sources',403)
 const row=await db.prepare('SELECT * FROM p_discovery_drafts WHERE proposal_id=? AND revision=?').bind(text(p.id,'a proposal'),Number(p.revision)).first<any>();need(row,'Discovery sources not found',404)
 return {...row,sources:JSON.parse(row.sources),citations:JSON.parse(row.citations),unmatched:JSON.parse(row.unmatched),catalog_snapshot:JSON.parse(row.catalog_snapshot)}
}
