import { need, type Actor } from '../model'
import { cell } from '../invoices'

export const performanceDimensions = ['owner','template','service','segment','quarter'] as const
export const performanceFilterKeys = ['groupBy',...performanceDimensions]
const missing = 'Not recorded'
const median = (values:number[]) => { const a=values.sort((a,b)=>a-b),n=a.length;return n?(a[Math.floor((n-1)/2)]+a[Math.floor(n/2)])/2:null }
const parse = (value:any) => typeof value==='string'?JSON.parse(value):value
export const historicalLines = (options:any[]) => options.flatMap(o=>(o.tables??[]).flatMap((t:any)=>t.lines.map((l:any)=>({...l,optionId:o.id}))))

/** Internal business history only. No invitations, model calls or client authority enter this read. */
export async function performanceHistory(db:D1Database,a:Actor) {
 need(a.role==='owner','Only the owner reads sales performance and historical price suggestions',403)
 const [proposals,outcomes,payments]=await Promise.all([
  db.prepare(`SELECT p.*,c.segment,a.snapshot AS accepted_snapshot,a.accepted_at,a.total_cents,a.option_id,e.sent_at,s.template_id,t.name AS template_name
   FROM p_proposals p JOIN p_clients c ON c.id=p.client_id LEFT JOIN p_acceptances a ON a.proposal_id=p.id
   LEFT JOIN p_expiry e ON e.proposal_id=p.id LEFT JOIN p_template_sources s ON s.proposal_id=p.id
   LEFT JOIN p_personal_templates t ON t.id=s.template_id`).all<any>(),
  db.prepare('SELECT * FROM p_outcomes UNION ALL SELECT * FROM p_outcome_records').all<any>(),
  db.prepare('SELECT proposal_id,revision,received_on,recorded_at FROM p_payment_records').all<any>(),
 ])
 return proposals.results.flatMap(p=>{
  const outcome=outcomes.results.find(o=>o.proposal_id===p.id&&o.revision===p.revision)
  if(p.accepted_at==null&&!outcome)return []
  const won=p.accepted_at!=null||outcome.kind==='won',at=p.accepted_at??outcome.occurred_at,options=parse(p.accepted_snapshot??'null')?.options??parse(p.options)
  const lines=historicalLines(options),selected=won&&p.option_id?lines.filter(l=>l.optionId===p.option_id):lines
  const received=payments.results.filter(r=>r.proposal_id===p.id&&r.revision===p.revision).map(r=>r.received_on?Date.parse(r.received_on+'T00:00:00Z'):r.recorded_at).filter(t=>p.accepted_at!=null&&t>=Date.parse(new Date(p.accepted_at).toISOString().slice(0,10)+'T00:00:00Z')).map(t=>Math.max(t,p.accepted_at))
  const date=new Date(at),quarter=`${date.getUTCFullYear()}-Q${Math.floor(date.getUTCMonth()/3)+1}`
  return [{id:p.id,title:p.title,revision:p.revision,currency:p.currency,won,at,reason:won?null:outcome.reason,
   valueCents:p.total_cents??Math.max(...options.map((o:any)=>o.cents)),owner:p.sales_owner_id??missing,ownerLabel:p.sales_owner_name??missing,
   template:p.template_id??missing,templateLabel:p.template_name??p.template_id??missing,segment:p.segment||missing,quarter,
   services:[...new Map(lines.map(l=>[l.catalogId??l.name,{id:l.catalogId??l.name,label:l.name}])).values()],lines:selected,
   signMs:p.accepted_at!=null&&p.sent_at!=null&&p.accepted_at>=p.sent_at?p.accepted_at-p.sent_at:null,
   payMs:received.length?Math.min(...received)-p.accepted_at:null}]
 })
}

function metrics(rows:any[]) {
 const wins=rows.filter(r=>r.won),lostReasons:Record<string,number>=Object.create(null)
 for(const r of rows.filter(r=>!r.won))lostReasons[r.reason||missing]=(lostReasons[r.reason||missing]??0)+1
 return {decided:rows.length,won:wins.length,lost:rows.length-wins.length,winRateBps:rows.length?Math.round(wins.length*10000/rows.length):null,
  medianTimeToSignMs:median(wins.flatMap(r=>r.signMs==null?[]:[r.signMs])),signSamples:wins.filter(r=>r.signMs!=null).length,
  medianTimeToPayMs:median(wins.flatMap(r=>r.payMs==null?[]:[r.payMs])),paySamples:wins.filter(r=>r.payMs!=null).length,
  averageDealCents:wins.length?Math.round(wins.reduce((n,r)=>n+r.valueCents,0)/wins.length):null,lostReasons}
}
export function salesPerformance(history:any[],params=new URLSearchParams(),at=Date.now()) {
 const groupBy=params.get('groupBy')??'quarter';need(performanceDimensions.includes(groupBy as any),'Choose a performance grouping')
 for(const key of performanceFilterKeys)need((params.get(key)??'').length<=200,'Performance filters must be at most 200 characters')
 const selected=history.filter(r=>performanceDimensions.every(key=>!params.get(key)||(key==='service'?r.services.some((s:any)=>s.id===params.get(key)):r[key]===params.get(key))))
 const groups=new Map<string,{key:string,label:string,currency:string,members:any[]}>()
 for(const r of selected){const keys=groupBy==='service'?(r.services.length?r.services:[{id:missing,label:missing}]):[{id:r[groupBy],label:r[groupBy+'Label']??r[groupBy]}]
  for(const k of keys){const id=JSON.stringify([k.id,r.currency]),group=groups.get(id)??{key:k.id,label:k.label,currency:r.currency,members:[] as any[]};group.members.push(r);groups.set(id,group)}
 }
 const rows=[...groups.values()].sort((a,b)=>a.label.localeCompare(b.label)||a.currency.localeCompare(b.currency)).map(({members,...r})=>({...r,...metrics(members)}))
 const totals=[...new Set(selected.map(r=>r.currency))].sort().map(currency=>({currency,...metrics(selected.filter(r=>r.currency===currency))}))
 return {view:'sales-performance',groupBy,count:selected.length,rows,totals,generatedAt:at}
}
export function performanceCsv(report:ReturnType<typeof salesPerformance>) {
 const header=['Group','Currency','Decided','Won','Lost','Win rate percent','Median days to sign','Signing samples','Median days to first payment','Payment samples','Average won deal value','Lost reasons']
 const row=(r:any,label:string)=>[label,r.currency,r.decided,r.won,r.lost,r.winRateBps==null?'':(r.winRateBps/100).toFixed(2),r.medianTimeToSignMs==null?'':r.medianTimeToSignMs/86400000,r.signSamples,r.medianTimeToPayMs==null?'':r.medianTimeToPayMs/86400000,r.paySamples,r.averageDealCents==null?'':(r.averageDealCents/100).toFixed(2),JSON.stringify(r.lostReasons)]
 return [header,...report.rows.map(r=>row(r,r.label)),...report.totals.map(r=>row(r,'Total'))].map(r=>r.map(v=>cell(String(v))).join(',')).join('\r\n')+'\r\n'
}
export function performanceMail(report:ReturnType<typeof salesPerformance>,filters:string):[string,string] {
 return ['Platter sales performance report',`${report.count} decided proposals.\nFilters: ${filters}\n${performanceCsv(report)}`]
}
