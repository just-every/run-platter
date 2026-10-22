import { scope } from '../permissions'
import { need, type Actor } from '../model'
export const revenueReaders=['owner','admin','manager','sales','viewer','billing']
/** Recorded receipts only. No provider references, notes, credentials or private costs enter reports. */
export async function recordedRevenue(db:D1Database,a:Actor){
 if(!revenueReaders.includes(a.role))return new Map<string,any>()
 const visibility=scope(a,'view')
 const payments=(await db.prepare('SELECT r.id,r.proposal_id,r.cents FROM p_payment_records r JOIN p_proposals p ON p.id=r.proposal_id WHERE ('+visibility.sql+')').bind(...visibility.values).all<any>()).results
 const refunds=(await db.prepare('SELECT f.payment_id,f.cents,f.status FROM p_refunds f JOIN p_payment_records r ON r.id=f.payment_id JOIN p_proposals p ON p.id=r.proposal_id WHERE ('+visibility.sql+')').bind(...visibility.values).all<any>()).results
 const deposits=(await db.prepare('SELECT i.proposal_id,a.deposit_cents FROM p_invoices i JOIN p_acceptances a ON a.proposal_id=i.proposal_id JOIN p_proposals p ON p.id=i.proposal_id WHERE ('+visibility.sql+')').bind(...visibility.values).all<any>()).results
 const byPayment=new Map<string,any[]>();for(const f of refunds){const list=byPayment.get(f.payment_id)??[];list.push(f);byPayment.set(f.payment_id,list)}
 const result=new Map<string,any>()
 const add=(a:number,b:number)=>{const n=a+b;need(Number.isSafeInteger(n),'Recorded revenue exceeds the exact reporting limit',409);return n}
 for(const p of payments){const r=result.get(p.proposal_id)??{receivedCents:0,refundedCents:0,uncertainRefundCents:0,netReceivedCents:0,exportedDepositCents:0};r.receivedCents=add(r.receivedCents,p.cents);for(const f of byPayment.get(p.id)??[]){const key=f.status==='succeeded'?'refundedCents':'uncertainRefundCents';r[key]=add(r[key],f.cents)}r.netReceivedCents=r.receivedCents-r.refundedCents;result.set(p.proposal_id,r)}
 for(const d of deposits){const r=result.get(d.proposal_id)??{receivedCents:0,refundedCents:0,uncertainRefundCents:0,netReceivedCents:0,exportedDepositCents:0};r.exportedDepositCents=d.deposit_cents;result.set(d.proposal_id,r)}
 return result
}
export const revenueKeys=['receivedCents','refundedCents','netReceivedCents','uncertainRefundCents','exportedDepositCents'] as const
export const revenueLabels=['Received payments','Confirmed refunds','Net received','Unconfirmed refunds','Exported deposit CSV value']
