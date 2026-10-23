import type { Bindings } from '../../auth.server'
import { commit, need, text, type Actor } from '../model'
import { currentTime, localDate, addDays } from '../expiry-time'
import { installationZone } from '../reports/report-state'
export const financeRoles=['owner','admin','billing']
export async function ensureAmounts(env:Bindings,id?:string,at?:number){
 const db=env.DB,zone=await installationZone(db),now=at??await currentTime(db),today=localDate(now,zone)
 const accepts=(await db.prepare('SELECT * FROM p_acceptances'+(id?' WHERE proposal_id=?':'')).bind(...(id?[id]:[])).all<any>()).results
 for(const a of accepts){
  const snap=JSON.parse(a.snapshot),rows=snap.schedule?.length?snap.schedule:[{id:'deposit',label:'Deposit',cents:a.deposit_cents,kind:'deposit',issueOn:null,netDays:0}]
  for(const r of rows){
   const dates:string[]=[]
   if(r.kind==='recurring'){
    const start=r.issueOn,day=Number(start.slice(8)),month=Number(start.slice(5,7))-1,year=Number(start.slice(0,4))
    // Bound each sweep; recurring periods are derived from the original anchor, never the clipped February date.
    const elapsed=(Number(today.slice(0,4))-year)*12+Number(today.slice(5,7))-1-month
    need(elapsed<=1200,'Recurring schedule exceeds 100 years; review it before continuing',409)
    for(let n=0;n<=Math.max(0,elapsed);n++){const first=new Date(Date.UTC(year,month+n,1)),last=new Date(Date.UTC(first.getUTCFullYear(),first.getUTCMonth()+1,0)).getUTCDate();dates.push(new Date(Date.UTC(first.getUTCFullYear(),first.getUTCMonth(),Math.min(day,last))).toISOString().slice(0,10))}
   }else dates.push(r.kind==='deposit'?localDate(a.accepted_at,zone):r.issueOn)
   for(const date of dates){
    const key=r.id+(r.kind==='recurring'?':'+date:''),amountId=a.proposal_id+':'+key
    await db.prepare('INSERT OR IGNORE INTO p_amounts(id,proposal_id,schedule_key,kind,label,cents,currency,issue_on,due_on,net_days) VALUES(?,?,?,?,?,?,?,?,?,?)').bind(amountId,a.proposal_id,key,r.kind,r.label,r.cents,a.currency,date,date?addDays(date,r.netDays):null,r.netDays).run()
   }
  }
 }
}
export async function amountRows(env:Bindings,proposalId?:string){
 const db=env.DB,now=await currentTime(db),today=localDate(now,await installationZone(db))
 const rows=(await db.prepare('SELECT a.*,p.title FROM p_amounts a JOIN p_proposals p ON p.id=a.proposal_id'+(proposalId?' WHERE a.proposal_id=?':'')+' ORDER BY a.proposal_id,a.issue_on,a.id').bind(...(proposalId?[proposalId]:[])).all<any>()).results
 const records=(await db.prepare("SELECT a.*,p.method,p.provider_charge,(SELECT COALESCE(SUM(r.cents),0) FROM p_refunds r WHERE r.payment_id=p.id AND r.status='succeeded') AS refunded_cents FROM p_payment_allocations a JOIN p_payment_records p ON p.id=a.payment_id").all<any>()).results
 const online=(await db.prepare('SELECT * FROM p_provider_payments').all<any>()).results
 return rows.map(r=>{
  const payments=online.filter(p=>p.amount_id===r.id),offline=records.filter(p=>p.amount_id===r.id&&p.method!=='stripe').reduce((n,p)=>n+p.cents,0),linked=records.filter(p=>p.amount_id===r.id&&p.method==='stripe'&&!payments.some(o=>o.charge_id===p.provider_charge)).reduce((n,p)=>n+p.cents-p.refunded_cents,0)
  const providerPaid=payments.filter(p=>['succeeded','partially_refunded'].includes(p.state)).reduce((n,p)=>n+p.cents-p.refunded_cents,0)
  const paid=Math.max(r.remote_paid_cents,offline+linked+providerPaid),due=Math.max(0,r.cents-paid),issued=Boolean(r.issue_on&&r.issue_on<=today)
  return {...r,...(paid>r.cents?{mismatch:'Payments exceed the accepted scheduled amount',accounting_status:'mismatch'}:{}),payments,offlineCents:offline,paidCents:paid,dueCents:issued?due:0,overdueCents:issued&&r.due_on<today?due:0,state:due===0?'paid':payments.some(p=>p.state==='disputed')?'disputed':payments.some(p=>p.state==='processing')?'processing':payments.some(p=>p.state==='failed')?'failed':issued?'due':'scheduled'}
 })
}
export const amountTotals=(rows:any[])=>({dueCents:rows.reduce((n,r)=>n+r.dueCents,0),paidCents:rows.reduce((n,r)=>n+r.paidCents,0),overdueCents:rows.reduce((n,r)=>n+r.overdueCents,0),scheduledCents:rows.filter(r=>r.state==='scheduled').reduce((n,r)=>n+r.cents,0)})
export async function markMilestone(env:Bindings,a:Actor,p:Record<string,unknown>){
 need(a.role==='owner','Only the owner marks milestone events done',403)
 const row=await env.DB.prepare('SELECT * FROM p_amounts WHERE id=?').bind(text(p.amountId,'a scheduled amount',300)).first<any>()
 need(row&&row.kind==='milestone','Choose a milestone',404);need(!row.issue_on,'This milestone already has an issue day',409)
 const today=localDate(await currentTime(env.DB),await installationZone(env.DB))
 await commit(env.DB,a,[env.DB.prepare('UPDATE p_amounts SET issue_on=?,due_on=?,version=version+1 WHERE id=?').bind(today,addDays(today,row.net_days),row.id)],false,{sql:'EXISTS(SELECT 1 FROM p_amounts WHERE id=? AND issue_on IS NULL AND version=?)',values:[row.id,row.version]})
 return {id:row.proposal_id,amountId:row.id,issueOn:today}
}
