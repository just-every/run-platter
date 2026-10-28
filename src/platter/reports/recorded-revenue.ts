import { scope } from '../permissions'
import { need, type Actor } from '../model'
export const revenueReaders=['owner','admin','manager','sales','viewer','billing']
/** Recorded receipts only. No provider references, notes, credentials or private costs enter reports. */
export async function recordedRevenue(db:D1Database,a:Actor){
 if(!revenueReaders.includes(a.role))return new Map<string,any>()
 const visibility=scope(a,'view')
 const payments=(await db.prepare('SELECT r.id,r.proposal_id,r.cents,r.received_on FROM p_payment_records r JOIN p_proposals p ON p.id=r.proposal_id WHERE ('+visibility.sql+')').bind(...visibility.values).all<any>()).results
 const refunds=(await db.prepare('SELECT f.payment_id,f.cents,f.status FROM p_refunds f JOIN p_payment_records r ON r.id=f.payment_id JOIN p_proposals p ON p.id=r.proposal_id WHERE ('+visibility.sql+')').bind(...visibility.values).all<any>()).results
 const deposits=(await db.prepare('SELECT i.proposal_id,a.deposit_cents FROM p_invoices i JOIN p_acceptances a ON a.proposal_id=i.proposal_id JOIN p_proposals p ON p.id=i.proposal_id WHERE ('+visibility.sql+')').bind(...visibility.values).all<any>()).results
 const byPayment=new Map<string,any[]>();for(const f of refunds){const list=byPayment.get(f.payment_id)??[];list.push(f);byPayment.set(f.payment_id,list)}
 const result=new Map<string,any>()
 const add=(a:number,b:number)=>{const n=a+b;need(Number.isSafeInteger(n),'Recorded revenue exceeds the exact reporting limit',409);return n}
 for(const p of payments){const r=result.get(p.proposal_id)??{receivedCents:0,refundedCents:0,uncertainRefundCents:0,netReceivedCents:0,exportedDepositCents:0,receipts:[]};const receipt={on:p.received_on,cents:p.cents,refundedCents:0,uncertainRefundCents:0};r.receivedCents=add(r.receivedCents,p.cents);for(const f of byPayment.get(p.id)??[]){const key=f.status==='succeeded'?'refundedCents':'uncertainRefundCents';r[key]=add(r[key],f.cents);receipt[key as 'refundedCents'|'uncertainRefundCents']=add(receipt[key as 'refundedCents'|'uncertainRefundCents'],f.cents)}r.receipts.push(receipt);r.netReceivedCents=r.receivedCents-r.refundedCents;result.set(p.proposal_id,r)}
 for(const d of deposits){const r=result.get(d.proposal_id)??{receivedCents:0,refundedCents:0,uncertainRefundCents:0,netReceivedCents:0,exportedDepositCents:0,receipts:[]};r.exportedDepositCents=d.deposit_cents;result.set(d.proposal_id,r)}
 return result
}
export const revenueKeys=['oneOffCents','firstYearCents','receivedCents','refundedCents','netReceivedCents','uncertainRefundCents','exportedDepositCents'] as const
export const revenueLabels=['Booked one-off value','Booked first-year value','Received payments','Confirmed refunds','Net received','Unconfirmed refunds','Exported deposit CSV value']

/** Independent inclusive UTC booking dates and recorded receipt dates; never infer a provider receipt date. */
export function revenuePeriods(params:URLSearchParams){
 const dates=Object.fromEntries(['bookedFrom','bookedTo','receivedFrom','receivedTo'].map(key=>{
  const value=params.get(key)||'',at=new Date(value+'T00:00:00Z')
  need(!value||(/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(at.getTime())&&at.toISOString().slice(0,10)===value),'Choose a valid report date')
  return [key,value]
 }))
 need(!dates.bookedFrom||!dates.bookedTo||dates.bookedFrom<=dates.bookedTo,'Booking start exceeds booking end')
 need(!dates.receivedFrom||!dates.receivedTo||dates.receivedFrom<=dates.receivedTo,'Receipt start exceeds receipt end')
 return dates
}
const within=(date:string|null,from:string,to:string)=>!from&&!to||Boolean(date&&(!from||date>=from)&&(!to||date<=to))
export function periodRevenue(p:any,dates:Record<string,string>){
 const bookedOn=new Date(p.acceptance.acceptedAt).toISOString().slice(0,10)
 const booked=within(bookedOn,dates.bookedFrom,dates.bookedTo),fees=p.acceptance.selection?.fees
 const receipts=(p.recordedRevenue?.receipts??[]).filter((r:any)=>within(r.on,dates.receivedFrom,dates.receivedTo))
 const sum=(key:string)=>receipts.reduce((n:number,r:any)=>n+r[key],0)
 const receivedCents=sum('cents'),refundedCents=sum('refundedCents')
 return {included:booked||receipts.length>0,bookedOn,valueCents:booked?p.acceptance.totalCents:0,recordedRevenue:{
  oneOffCents:booked?(fees?.oneOffCents??p.acceptance.totalCents):0,
  firstYearCents:booked?(fees?.firstYearCents??p.acceptance.totalCents):0,
  receivedCents,refundedCents,netReceivedCents:receivedCents-refundedCents,
  uncertainRefundCents:sum('uncertainRefundCents'),exportedDepositCents:booked?(p.recordedRevenue?.exportedDepositCents??0):0,
 }}
}
