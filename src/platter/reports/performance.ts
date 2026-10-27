import { scope, reporters } from '../permissions'
import { need, type Actor } from '../model'
import { cell } from '../invoices'

export const dimensions=['owner','template','service','segment','quarter'] as const
export function performanceFilters(params:URLSearchParams){
 const group=params.get('group')||'quarter';need(dimensions.includes(group as any),'Choose owner, template, service, segment or quarter')
 const quarter=params.get('quarter');need(!quarter||/^\d{4}-Q[1-4]$/.test(quarter),'Choose a quarter such as 2026-Q1')
 return {group,quarter}
}
/** One decision per proposal. Accepted snapshots and recorded outcomes are the source of truth. */
export async function performanceHistory(db:D1Database,a:Actor){
 need(reporters.includes(a.role),'Your role cannot view sales performance',403)
 const visibility=scope(a,'report')
 const rows=(await db.prepare(`SELECT p.*,c.segment,t.template_id,COALESCE(pt.name,t.template_id,'Not recorded') AS template_name,e.sent_at,
 ac.snapshot AS accepted_snapshot,ac.accepted_at,ac.option_id,ac.total_cents
 FROM p_proposals p JOIN p_clients c ON c.id=p.client_id LEFT JOIN p_template_sources t ON t.proposal_id=p.id
 LEFT JOIN p_personal_templates pt ON pt.id=t.template_id LEFT JOIN p_expiry e ON e.proposal_id=p.id
 LEFT JOIN p_acceptances ac ON ac.proposal_id=p.id WHERE (${visibility.sql})`).bind(...visibility.values).all<any>()).results
 const outcomes=(await db.prepare('SELECT * FROM (SELECT * FROM p_outcomes UNION ALL SELECT * FROM p_outcome_records) ORDER BY occurred_at DESC,revision DESC').all<any>()).results
 const payments=(await db.prepare('SELECT proposal_id,revision,received_on FROM p_payment_records ORDER BY received_on,id').all<any>()).results
 return rows.flatMap(p=>{
  const outcome=outcomes.find(o=>o.proposal_id===p.id&&o.revision===p.revision)
  const won=outcome?.kind==='won'||Boolean(p.accepted_at),lost=!won&&['lost','declined'].includes(outcome?.kind)
  if(!won&&!lost)return []
  const content=p.accepted_snapshot?JSON.parse(p.accepted_snapshot):{options:JSON.parse(p.options)}
  const options=p.accepted_snapshot?content.options.filter((o:any)=>o.id===p.option_id):content.options
  const lines=options.flatMap((o:any)=>(o.tables??[]).flatMap((t:any)=>t.lines))
  const at=p.accepted_at??outcome.occurred_at,date=new Date(at),quarter=`${date.getUTCFullYear()}-Q${Math.floor(date.getUTCMonth()/3)+1}`
  const receipt=payments.find(r=>r.proposal_id===p.id&&r.revision===(content.revision??p.revision)&&p.accepted_at!=null&&Date.parse(r.received_on+'T00:00:00Z')>=p.accepted_at)
  const paidAt=receipt?Date.parse(receipt.received_on+'T00:00:00Z'):null
  return [{id:p.id,title:p.title,currency:p.currency,owner:p.sales_owner_name??'Not recorded',ownerId:p.sales_owner_id??'Not recorded',template:p.template_name,templateId:p.template_id??'Not recorded',segment:p.segment,quarter,won,lost,accepted:Boolean(p.accepted_at),reason:lost?outcome.reason:null,lines,
   services:[...new Set(lines.length?lines.map((l:any)=>l.catalogId??l.name):options.map((o:any)=>o.label))],
   valueCents:p.total_cents??Math.max(...options.map((o:any)=>o.cents)),
   signMs:p.accepted_at&&p.sent_at!=null&&p.accepted_at>=p.sent_at?p.accepted_at-p.sent_at:null,
   payMs:paidAt!=null&&p.accepted_at&&paidAt>=p.accepted_at?paidAt-p.accepted_at:null}]
 })
}
const median=(values:number[])=>{values.sort((a,b)=>a-b);const n=values.length;return n?(values[Math.floor((n-1)/2)]+values[Math.floor(n/2)])/2:null}
export async function salesPerformance(db:D1Database,a:Actor,params=new URLSearchParams()){
 const {group,quarter}=performanceFilters(params),history=(await performanceHistory(db,a)).filter(p=>!quarter||p.quarter===quarter)
 const buckets=new Map<string,any[]>()
 for(const p of history)for(const key of group==='service'?p.services:[group==='owner'?p.ownerId:group==='template'?p.templateId:(p as any)[group]]){
  const id=JSON.stringify([key,p.currency]),rows=buckets.get(id)??[];rows.push(p);buckets.set(id,rows)
 }
 const rows=[...buckets].sort(([a],[b])=>a.localeCompare(b)).map(([key,values])=>{
  const [id,currency]=JSON.parse(key)
  const label=group==='owner'?values[0].owner:group==='template'?values[0].template:group==='service'?(values[0].lines.find((l:any)=>(l.catalogId??l.name)===id)?.name??id):id
  return metrics(id,label,currency,values)
 })
 const totals=[...new Set(history.map(p=>p.currency))].sort().map(currency=>metrics('total','Total',currency,history.filter(p=>p.currency===currency)))
 return {kind:'sales-performance' as const,group,quarter,count:history.length,rows,totals,generatedAt:Date.now()}
}
function metrics(id:string,label:string,currency:string,values:any[]){
 const wins=values.filter(p=>p.won),reasons:Record<string,number>=Object.create(null)
 for(const p of values.filter(p=>p.lost))reasons[p.reason||'Not recorded']=(reasons[p.reason||'Not recorded']??0)+1
 return {id,label,currency,decided:values.length,won:wins.length,lost:values.length-wins.length,winRate:100*wins.length/values.length,
  medianSignMs:median(values.flatMap(p=>p.signMs==null?[]:[p.signMs])),signSamples:values.filter(p=>p.signMs!=null).length,
  medianPayMs:median(values.flatMap(p=>p.payMs==null?[]:[p.payMs])),paySamples:values.filter(p=>p.payMs!=null).length,
  averageDealCents:wins.length?wins.reduce((n,p)=>n+p.valueCents,0)/wins.length:null,lostReasons:reasons}
}

export const performanceColumns=['Group','Currency','Decided','Won','Lost','Win rate percent','Median sign days','Sign samples','Median pay days','Payment samples','Average won deal','Lost reasons']
export const performanceValues=(r:any)=>[r.label,r.currency,r.decided,r.won,r.lost,r.winRate.toFixed(1),r.medianSignMs==null?'':r.medianSignMs/86400000,r.signSamples,r.medianPayMs==null?'':r.medianPayMs/86400000,r.paySamples,r.averageDealCents==null?'':(r.averageDealCents/100).toFixed(2),JSON.stringify(r.lostReasons)]
export const performanceCsv=(report:any)=>[performanceColumns,...[...report.rows,...report.totals].map(performanceValues)].map(row=>row.map(cell).join(',')).join('\r\n')+'\r\n'
export function performanceMail(report:any,filters:string):[string,string]{return ['Platter sales performance report',`${report.count} decided proposals. Filters: ${filters}\n${[...report.rows,...report.totals].map((r:any)=>performanceValues(r).map((v:any,i:number)=>i===10&&r.averageDealCents!=null?'$'+(Math.round(r.averageDealCents)/100).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})+' '+r.currency:v).join(' · ')).join('\n')}\nCSV:\n${performanceCsv(report)}`]}
