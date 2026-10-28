import { occurrence } from '../recurring'
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
 const invoices=(await db.prepare('SELECT i.proposal_id,i.currency,i.issued_on,i.due_on,i.total_cents,i.balance_cents,i.observed_at FROM p_revenue_invoices i JOIN p_proposals p ON p.id=i.proposal_id WHERE ('+visibility.sql+') ORDER BY i.account_id,i.invoice_id').bind(...visibility.values).all<any>()).results
 for(const invoice of invoices){const r=result.get(invoice.proposal_id)??{receivedCents:0,refundedCents:0,uncertainRefundCents:0,netReceivedCents:0,exportedDepositCents:0,receipts:[]};(r.invoices??=[]).push(invoice);result.set(invoice.proposal_id,r)}
 return result
}
export const revenueKeys=['oneOffCents','firstYearCents','receivedCents','refundedCents','netReceivedCents','uncertainRefundCents','exportedDepositCents','mrrCents','invoicedCents','outstandingCents','overdueCents','accountingPaidCents','accountingDifferenceCents'] as const
export const revenueLabels=['Booked one-off value','Booked first-year value','Received payments','Confirmed refunds','Net received','Unconfirmed refunds','Exported deposit CSV value','Booked MRR','Accounting invoiced','Accounting outstanding','Accounting overdue','Accounting applied (all time)','Receipt difference (all time)']

/** Independent inclusive UTC booking dates and recorded receipt dates; never infer a provider receipt date. */
export function revenuePeriods(params:URLSearchParams){
 const dates=Object.fromEntries(['bookedFrom','bookedTo','receivedFrom','receivedTo','invoicedFrom','invoicedTo','asOf'].map(key=>{
  const value=params.get(key)||'',at=new Date(value+'T00:00:00Z')
  need(!value||(/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(at.getTime())&&at.toISOString().slice(0,10)===value),'Choose a valid report date')
  return [key,value]
 }))
 need(!dates.bookedFrom||!dates.bookedTo||dates.bookedFrom<=dates.bookedTo,'Booking start exceeds booking end')
 need(!dates.receivedFrom||!dates.receivedTo||dates.receivedFrom<=dates.receivedTo,'Receipt start exceeds receipt end')
 need(!dates.invoicedFrom||!dates.invoicedTo||dates.invoicedFrom<=dates.invoicedTo,'Invoice start exceeds invoice end')
 return dates
}
const within=(date:string|null,from:string,to:string)=>!from&&!to||Boolean(date&&(!from||date>=from)&&(!to||date<=to))
export function periodRevenue(p:any,dates:Record<string,string>,now=Date.now()){
 const bookedOn=new Date(p.acceptance.acceptedAt).toISOString().slice(0,10)
 const booked=within(bookedOn,dates.bookedFrom,dates.bookedTo),fees=p.acceptance.selection?.fees
 const receipts=(p.recordedRevenue?.receipts??[]).filter((r:any)=>within(r.on,dates.receivedFrom,dates.receivedTo))
 const sum=(key:string)=>receipts.reduce((n:number,r:any)=>n+r[key],0)
 const receivedCents=sum('cents'),refundedCents=sum('refundedCents')
 const invoices=(p.recordedRevenue?.invoices??[]).filter((i:any)=>i.currency===p.acceptance.currency)
 const selected=invoices.filter((i:any)=>within(i.issued_on,dates.invoicedFrom,dates.invoicedTo)),asOf=dates.asOf||new Date(now).toISOString().slice(0,10)
 const total=(rows:any[],key:string)=>rows.reduce((n:number,r:any)=>n+r[key],0)
 const accountingPaidCents=total(invoices,'total_cents')-total(invoices,'balance_cents')
 const difference=invoices.length?(p.recordedRevenue?.netReceivedCents??0)-accountingPaidCents:0
 const accounting={status:!invoices.length?'Not linked':difference===0?'Matched':'Mismatch',invoiceCount:invoices.length,refreshedAt:invoices.length?Math.min(...invoices.map((i:any)=>i.observed_at)):null}
 // Normalize immutable installment rates, rounding each line to the nearest cent.
 const recurring=fees?.recurring??[],retainers=p.acceptance.paymentSchedule?.rows?.filter((r:any)=>r.kind==='retainer')??[],retainer=retainers[0]
 const retainerYearEnd=retainer?occurrence({interval:'annual',term:1,startsOn:retainer.date},1):''
 const bookedValue=p.acceptance.totalCents+total(retainers,'amountCents')
 const firstYear=fees?.firstYearCents??p.acceptance.totalCents+total(retainers.filter((r:any)=>r.date<retainerYearEnd),'amountCents')
 const mrr=recurring.reduce((n:number,r:any)=>n+monthlyRate(r),0)+(retainer?.amountCents??0)

 return {included:booked||receipts.length>0||selected.length>0,bookedOn,accounting,valueCents:booked?bookedValue:0,recordedRevenue:{
  mrrCents:booked?mrr:0,invoicedCents:total(selected,'total_cents'),outstandingCents:total(selected,'balance_cents'),overdueCents:total(selected.filter((i:any)=>i.due_on<asOf),'balance_cents'),accountingPaidCents,accountingDifferenceCents:difference,
  oneOffCents:booked?(fees?.oneOffCents??p.acceptance.totalCents):0,
  firstYearCents:booked?firstYear:0,
  receivedCents,refundedCents,netReceivedCents:receivedCents-refundedCents,
  uncertainRefundCents:sum('uncertainRefundCents'),exportedDepositCents:booked?(p.recordedRevenue?.exportedDepositCents??0):0,
 }}
}

function monthlyRate(line:any):number {
 const rates={weekly:[52,12],monthly:[1,1],quarterly:[1,3],annual:[1,12]}
 const [numerator,denominator]=rates[line.interval as keyof typeof rates]
 return Math.floor((line.amountCents*numerator+denominator/2)/denominator)
}
