import { localDate, addDays } from '../expiry-time'

export const followupReasons = { bounced: 'Bounced email', question: 'Client question waiting', expiring: 'Expiring within 3 days', unavailable: 'Engagement unavailable' }
export function followupQueue(proposals:any[], records:any[], notices:any[], zone:string, now:number, owner?:string) {
 const today=localDate(now,zone)
 const rows=proposals.flatMap(p=>{
  if(p.acceptance||(p.activeWithdrawal&&!p.negotiating)||p.status==='withdrawn')return []
  const saved=records.find(r=>r.proposal_id===p.id&&r.revision===p.revision)
  if(saved?.closed_at)return []
  const ownerZone=p.ownerTimeZone??zone,ownerToday=localDate(now,ownerZone),dueDate=saved?.due_date??localDate(p.created_at,ownerZone)
  const reason=notices.some(n=>n.proposal_id===p.id&&!n.closed_at)?'bounced':p.questions?.some((q:any)=>q.revision===p.revision&&q.status==='open')?'question':p.expiry?.deadlineAt>now&&localDate(p.expiry.deadlineAt,ownerZone)<=addDays(ownerToday,3)?'expiring':'unavailable'
  return [{id:p.id,title:p.title,ownerId:p.sales_owner_id,owner:p.sales_owner_name||'Not recorded',revision:p.revision,version:p.version,currency:p.currency,valueCents:Math.max(...p.options.map((o:any)=>o.cents)),dueDate,timeZone:ownerZone,action:saved?.action??(['draft','approved'].includes(p.status)?(p.approval?p.approval.complete?'Send approved offer':'Approve revision':p.status==='draft'?'Approve revision':'Send approved offer'):p.status==='expired'?'Review expiry or reopening':'Follow up with client'),reason,engagement:'unavailable',scheduled:Boolean(saved),sentAt:p.expiry?.sentAt??null,period:dueDate<ownerToday?'overdue':dueDate===ownerToday?'today':'upcoming'}]
 }).filter(r=>!owner||(r.ownerId||'unrecorded')===owner)
 const rank=(reason:string)=>['bounced','question','payment','expiring','viewed','unopened','unavailable'].indexOf(reason)
 rows.sort((a,b)=>['overdue','today','upcoming'].indexOf(a.period)-['overdue','today','upcoming'].indexOf(b.period)||a.dueDate.localeCompare(b.dueDate)||rank(a.reason)-rank(b.reason)||b.valueCents-a.valueCents||(a.sentAt??Number.MAX_SAFE_INTEGER)-(b.sentAt??Number.MAX_SAFE_INTEGER)||a.id.localeCompare(b.id))
 const totals=[...new Set(rows.map(r=>r.currency))].sort().map(currency=>({currency,count:rows.filter(r=>r.currency===currency).length,valueCents:rows.filter(r=>r.currency===currency).reduce((n,r)=>n+r.valueCents,0)}))
 return {rows,count:rows.length,totals,today,timeZone:zone}
}
