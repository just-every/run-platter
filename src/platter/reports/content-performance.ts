import { cell } from '../invoices'
import { placedLibrarySources } from '../library-links'
import { need, snapshot, type Actor } from '../model'

export async function freezeContentOffer(db:D1Database,row:any){
 const source=await db.prepare('SELECT * FROM p_template_sources WHERE proposal_id=?').bind(row.id).first<any>()
 const origin=await db.prepare('SELECT library_known FROM p_content_origins WHERE proposal_id=?').bind(row.id).first<any>()
 const library=await placedLibrarySources(db,row),options=snapshot(row).options
 return db.prepare('INSERT INTO p_content_offers(proposal_id,revision,template,packages,library_items,library_known) VALUES(?,?,?,?,?,?) ON CONFLICT DO NOTHING').bind(row.id,row.revision,source?.template_name?JSON.stringify({id:source.template_id,name:source.template_name,version:source.template_version}):null,JSON.stringify(options.map((o:any)=>({id:o.id,name:o.label,items:(o.optionalItems??[]).map((i:any)=>({id:i.id,name:i.label}))}))),JSON.stringify(library.map(u=>({id:u.item_id,name:u.title,version:u.item_version}))),origin?.library_known??0)
}
export type ContentRow={kind:string;key:string;name:string;offered:number;won:number;lost:number;chosen:number;rate:string;readingTime:null}
export async function contentPerformance(db:D1Database,a:Actor){
 need(a.role==='owner','Only the owner can view content performance',403)
 // An accepted agreement or the latest explicit decision determines one contribution per proposal.
 // A newer draft never replaces the revision on which that decision was made.
 const decisions=(await db.prepare(`WITH decisions AS (
 SELECT proposal_id,revision,'won' AS kind,accepted_at AS at,option_id,snapshot FROM p_acceptances
 UNION ALL SELECT proposal_id,revision,CASE WHEN kind='won' THEN 'won' ELSE 'lost' END,occurred_at,NULL,NULL FROM p_outcomes
 UNION ALL SELECT proposal_id,revision,CASE WHEN kind='won' THEN 'won' ELSE 'lost' END,occurred_at,NULL,NULL FROM p_outcome_records
 ), ranked AS (SELECT *,ROW_NUMBER() OVER(PARTITION BY proposal_id ORDER BY revision DESC,at DESC,option_id IS NOT NULL DESC) AS rank FROM decisions)
 SELECT d.*,f.template,f.packages,f.library_items,f.library_known FROM ranked d LEFT JOIN p_content_offers f ON f.proposal_id=d.proposal_id AND f.revision=d.revision WHERE rank=1 ORDER BY d.proposal_id`).all<any>()).results
 const groups=new Map<string,ContentRow>()
 let unavailableHistory=0,unavailableTemplate=0,unavailableLibrary=0
 for(const d of decisions){
  if(d.packages===null){unavailableHistory++;continue}
  if(!d.template)unavailableTemplate++
  if(!d.library_known)unavailableLibrary++
  const accepted=d.snapshot?JSON.parse(d.snapshot):null,selected=accepted?.selection?.items??[],seen=new Set<string>()
  const add=(kind:string,key:string,name:string,chosen=false)=>{
   const group=JSON.stringify([kind,key,name]);if(seen.has(group))return;seen.add(group)
   const row=groups.get(group)??{kind,key,name,offered:0,won:0,lost:0,chosen:0,rate:'',readingTime:null}
   row.offered++;if(d.kind==='won')row.won++;else row.lost++;if(chosen)row.chosen++;groups.set(group,row)
  }
  if(d.template){const t=JSON.parse(d.template);add('template',t.id,t.name)}
  const packages=JSON.parse(d.packages)
  for(const p of packages)add('package',p.name,p.name,packages.some((chosen:any)=>chosen.name===p.name&&chosen.id===d.option_id))
  const items=new Map<string,boolean>()
  for(const p of packages)for(const i of p.items)items.set(i.name,Boolean(items.get(i.name)||p.id===d.option_id&&selected.some((s:any)=>s.id===i.id&&s.quantity>0)))
  for(const [name,chosen] of items)add('optional-item',name,name,chosen)
  const libraryIds=new Set<string>()
  for(const item of JSON.parse(d.library_items)){if(libraryIds.has(item.id))continue;libraryIds.add(item.id);add('library',item.id,item.name)}
 }
 for(const row of groups.values())row.rate=((row.kind==='package'||row.kind==='optional-item'?row.chosen:row.won)*100/row.offered).toFixed(1)+'%'
 return {decidedCount:decisions.length,unavailableHistory,unavailableTemplate,unavailableLibrary,rows:[...groups.values()]}
}
export function filterContentReport(report:Awaited<ReturnType<typeof contentPerformance>>,params:URLSearchParams){
 const kind=params.get('kind')??'',q=(params.get('q')??'').trim(),sort=params.get('sort')||'name',direction=params.get('direction')||'asc'
 need(!kind||['template','package','optional-item','library'].includes(kind),'Choose a content type')
 need(q.length<=200,'Search must be at most 200 characters')
 need(['name','offered','won','lost','chosen','rate'].includes(sort),'Choose a content sort')
 need(['asc','desc'].includes(direction),'Choose a sort direction')
 const rows=report.rows.filter(r=>(!kind||r.kind===kind)&&(!q||r.name.toLowerCase().includes(q.toLowerCase()))).sort((a,b)=>{
  const result=sort==='name'?a.name.localeCompare(b.name):sort==='rate'?parseFloat(a.rate)-parseFloat(b.rate):Number(a[sort as keyof ContentRow])-Number(b[sort as keyof ContentRow])
  return (direction==='desc'?-result:result)||a.kind.localeCompare(b.kind)||a.key.localeCompare(b.key)
 })
 return {...report,rows,count:rows.length}
}
export function contentCsv(report:ReturnType<typeof filterContentReport>){
 return [['Type','Name','Offered','Won','Lost','Chosen','Rate','Reading time'],...report.rows.map(r=>[r.kind,r.name,r.offered,r.won,r.lost,r.chosen,r.rate,'Unavailable'])].map(row=>row.map(value=>cell(String(value))).join(',')).join('\r\n')+'\r\n'
}
export function contentMail(report:ReturnType<typeof filterContentReport>){
 return ['Platter content performance report',`${report.decidedCount} decided proposals; ${report.count} content rows.\n${report.unavailableHistory} decisions lack frozen history; ${report.unavailableTemplate} lack template attribution; ${report.unavailableLibrary} lack complete library provenance. Reading time is unavailable.\n\n${contentCsv(report)}`] as const
}
