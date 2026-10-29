import { offerSelection } from '../selection'
import { localDate, addDays } from '../expiry-time'

export const followupReasons = { renewal:'Agreement renewal', bounced: 'Bounced email', question: 'Client question waiting', expiring: 'Expiring within 3 days', viewed: 'Viewed but not signed', unopened: 'Unopened', unavailable: 'Engagement unavailable' }
export function followupQueue(proposals:any[], records:any[], notices:any[], zone:string, now:number, owner?:string) {
 const today=localDate(now,zone)
 const rows=proposals.flatMap(p=>{
  const saved=records.find(r=>r.proposal_id===p.id&&r.revision===p.revision)
  if((p.acceptance&&!saved?.renewal)||(p.activeWithdrawal&&!p.negotiating)||p.status==='withdrawn')return []
  if(saved?.closed_at)return []
  const ownerZone=p.ownerTimeZone??zone,ownerToday=localDate(now,ownerZone),dueDate=saved?.due_date??localDate(p.created_at,ownerZone)
  const reason=saved?.renewal?'renewal':notices.some(n=>n.proposal_id===p.id&&!n.closed_at)?'bounced':p.questions?.some((q:any)=>q.revision===p.revision&&q.status==='open')?'question':p.expiry?.deadlineAt>now&&localDate(p.expiry.deadlineAt,ownerZone)<=addDays(ownerToday,3)?'expiring':p.engagement??'unavailable'
  const readings=p.engagementDetails?.views.filter((v:any)=>v.revision===p.revision).flatMap((v:any)=>v.reading)??[],totals=new Map<string,{label:string;milliseconds:number}>()
  for(const r of readings){const prior=totals.get(r.section);totals.set(r.section,{label:r.label,milliseconds:(prior?.milliseconds??0)+r.milliseconds})}
  const section=[...totals.values()].filter(r=>r.milliseconds>0).sort((a,b)=>b.milliseconds-a.milliseconds||a.label.localeCompare(b.label))[0]
  const engagementReason=reason==='viewed'&&section?'Read '+section.label+' for '+(section.milliseconds/1000).toFixed(1)+' seconds':undefined
  return [{...(engagementReason?{engagementReason}:{}),id:p.id,title:p.title,ownerId:p.sales_owner_id,owner:p.sales_owner_name||'Not recorded',revision:p.revision,version:p.version,currency:p.currency,valueCents:Math.max(...p.options.map((o:any)=>{const s=offerSelection(p.options,p.deposit_bps,o.id,[],p);return s.fees?.firstYearCents??o.cents})),dueDate,timeZone:ownerZone,action:saved?.action??(['draft','approved'].includes(p.status)?(p.approval?p.approval.complete?'Send approved offer':'Approve revision':p.status==='draft'?'Approve revision':'Send approved offer'):p.status==='expired'?'Review expiry or reopening':'Follow up with client'),reason,engagement:p.engagement??'unavailable',scheduled:Boolean(saved),sentAt:p.expiry?.sentAt??null,period:dueDate<ownerToday?'overdue':dueDate===ownerToday?'today':'upcoming'}]
 }).filter(r=>!owner||(r.ownerId||'unrecorded')===owner)
 const rank=(reason:string)=>['bounced','question','payment','renewal','expiring','viewed','unopened','unavailable'].indexOf(reason)
 rows.sort((a,b)=>['overdue','today','upcoming'].indexOf(a.period)-['overdue','today','upcoming'].indexOf(b.period)||a.dueDate.localeCompare(b.dueDate)||rank(a.reason)-rank(b.reason)||b.valueCents-a.valueCents||(a.sentAt??Number.MAX_SAFE_INTEGER)-(b.sentAt??Number.MAX_SAFE_INTEGER)||a.id.localeCompare(b.id))
 const totals=[...new Set(rows.map(r=>r.currency))].sort().map(currency=>({currency,count:rows.filter(r=>r.currency===currency).length,valueCents:rows.filter(r=>r.currency===currency).reduce((n,r)=>n+r.valueCents,0)}))
 return {rows,count:rows.length,totals,today,timeZone:zone}
}
