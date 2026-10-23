import { setRemittance } from './payments/remittance'
import { syncAccounting } from './accounting/quickbooks'
import { ensureAmounts, amountRows } from './accounting/amounts'
import { recordOffline, allocateOffline } from './payments/offline'
import { applyEvent } from './payments/events'
import type { Bindings } from '../auth.server'
import { providerCredential, providerJson } from './connections'
import { commit, dollars, hash, need, text, type Actor } from './model'
const finance=['owner','admin','billing']
export async function paymentState(env:Bindings,a:Actor){
 if(!finance.includes(a.role))return []
 const refunds=(await env.DB.prepare('SELECT * FROM p_refunds ORDER BY requested_at,id').all<any>()).results
 return (await env.DB.prepare('SELECT * FROM p_payment_records ORDER BY recorded_at,id').all<any>()).results.map(p=>({...p,refunds:refunds.filter(r=>r.payment_id===p.id),heldCents:refunds.filter(r=>r.payment_id===p.id).reduce((n,r)=>n+r.cents,0)}))
}
async function chargeFor(env:Bindings,id:string){
 const {secret}=await providerCredential(env,'workspace:stripe'),charge=await providerJson('https://api.stripe.com/v1/charges/'+encodeURIComponent(id),secret.token)
 need(charge.id===id&&charge.paid===true&&charge.captured!==false&&charge.status==='succeeded'&&Number.isSafeInteger(charge.amount)&&charge.amount>0&&Number.isSafeInteger(charge.amount_refunded)&&charge.amount_refunded>=0&&charge.amount_refunded<=charge.amount,'Stripe did not confirm a refundable successful charge',409)
 return {charge,token:secret.token,accountId:secret.accountId}
}
export async function paymentCommand(env:Bindings,a:Actor,name:string,p:Record<string,unknown>){
 need(finance.includes(a.role),'Only owner, admins and billing manage payments and refunds',403)
 const db=env.DB
 if(name==='payment.remittance')return setRemittance(db,a,p)
 if(name==='payment.allocate')return allocateOffline(env,a,p)
 if(name==='payment.reconcile'){await applyEvent(env,text(p.eventId,'a held Stripe event'));return{reconciled:true}}
 if(name==='payment.record'){
  await ensureAmounts(env,String(p.id??''))
  if(!p.amountId){const issued=(await amountRows(env,String(p.id??''))).filter(r=>r.state!=='scheduled');need(issued.length===1,'Choose the scheduled invoice for this received payment',409);p={...p,amountId:issued[0].id}}
  if(!p.requestId)p={...p,requestId:'receipt-'+await hash(JSON.stringify([p.id,p.amountId,p.method,p.receivedOn,p.amount,p.reference]))}
  return recordOffline(env,a,p)
 }
 if(name==='payment.bind'){
  const id=text(p.id,'a proposal'),accepted=await db.prepare('SELECT * FROM p_acceptances WHERE proposal_id=?').bind(id).first<any>();need(accepted,'Accept the proposal before linking its deposit',409)
  need(p.consent===true||p.consent==='yes','Confirm this Stripe charge belongs to the accepted deposit')
  const chargeId=text(p.chargeId,'the Stripe charge id',200),{charge,accountId}=await chargeFor(env,chargeId)
  need(charge.currency?.toUpperCase()===accepted.currency&&charge.amount===accepted.deposit_cents&&charge.metadata?.platter_proposal_id===id&&String(charge.metadata?.platter_revision)===String(accepted.revision),'The verified Stripe charge must match this accepted deposit, currency and revision',409)
  await ensureAmounts(env,id)
  const amount=await db.prepare("SELECT id FROM p_amounts WHERE proposal_id=? AND kind='deposit'").bind(id).first<any>()
  const old=await db.prepare('SELECT * FROM p_payment_records WHERE provider_charge=?').bind(chargeId).first<any>()
  if(old){need(old.proposal_id===id&&old.reference===accountId,'Charge already belongs to another proposal or account',409);if(amount)await commit(db,a,[db.prepare('INSERT OR IGNORE INTO p_payment_allocations(payment_id,amount_id,cents) VALUES(?,?,?)').bind(old.id,amount.id,old.cents)]);await syncAccounting(env,id);return{id:old.id,proposalId:id}}
  const recordId=crypto.randomUUID()
  await commit(db,a,[db.prepare("INSERT INTO p_payment_records(id,proposal_id,revision,currency,cents,method,provider_charge,reference,recorded_by,recorded_at) VALUES(?,?,?,?,?,'stripe',?,?,?,?)").bind(recordId,id,accepted.revision,accepted.currency,accepted.deposit_cents,chargeId,accountId,a.id,Date.now()),...(amount?[db.prepare('INSERT INTO p_payment_allocations(payment_id,amount_id,cents) VALUES(?,?,?)').bind(recordId,amount.id,accepted.deposit_cents)]:[])])
  await syncAccounting(env,id)
  return {id:recordId,proposalId:id}
 }
 need(name==='payment.refund','Unknown payment action',404)
 const payment=await db.prepare('SELECT * FROM p_payment_records WHERE id=?').bind(text(p.paymentId,'a payment')).first<any>();need(payment&&payment.method==='stripe','Choose a linked Stripe deposit',404)
 const reason=text(p.reason,'a refund reason',1000),cents=dollars(p.amount,'a refund amount'),requestId=text(p.requestId,'a refund request id',100);need(/^[A-Za-z0-9_-]+$/.test(requestId),'Use an opaque refund request id')
 need(p.consent===true||p.consent==='yes','Confirm this refund explicitly')
 const previous=await db.prepare('SELECT * FROM p_refunds WHERE id=?').bind(requestId).first<any>()
 if(previous){need(previous.payment_id===payment.id&&previous.cents===cents&&previous.reason===reason,'This request id already names a different refund',409);return {id:requestId,proposalId:payment.proposal_id,status:previous.status}}
 const {charge,token,accountId}=await chargeFor(env,payment.provider_charge)
 need(accountId===payment.reference&&charge.amount===payment.cents&&charge.currency?.toUpperCase()===payment.currency&&charge.metadata?.platter_proposal_id===payment.proposal_id&&String(charge.metadata?.platter_revision)===String(payment.revision),'Stripe deposit binding changed. Review the connection and charge.',409)
 need(cents<=charge.amount-charge.amount_refunded,'Refund exceeds the amount remaining at Stripe',409)
 await commit(db,a,[db.prepare("INSERT INTO p_refunds(id,payment_id,cents,reason,status,requested_by,requested_at) VALUES(?,?,?,?,'reserved',?,?)").bind(requestId,payment.id,cents,reason,a.id,Date.now()),db.prepare('UPDATE p_payment_records SET version=version+1 WHERE id=?').bind(payment.id)],false,{sql:'EXISTS(SELECT 1 FROM p_payment_records WHERE id=? AND version=?) AND ?<=?-(SELECT COALESCE(SUM(cents),0) FROM p_refunds WHERE payment_id=?)',values:[payment.id,payment.version,cents,payment.cents,payment.id]})
 // The reservation survives an uncertain provider response. Never issue this request again automatically.
 let status='needs_review',providerId:string|null=null
 try{
  const response=await fetch('https://api.stripe.com/v1/refunds',{method:'POST',redirect:'manual',headers:{authorization:'Bearer '+token,'content-type':'application/x-www-form-urlencoded','idempotency-key':'platter-refund-'+requestId},body:new URLSearchParams({charge:payment.provider_charge,amount:String(cents)})})
  if(response.ok){const value:any=await response.json();if(value.charge===payment.provider_charge&&value.amount===cents&&typeof value.id==='string'&&value.id.length<=200){providerId=value.id;status=value.status==='succeeded'?'succeeded':value.status==='pending'?'pending_provider':'needs_review'}}
 }catch{/* Keep the reservation for explicit provider reconciliation. */}
 await db.prepare('UPDATE p_refunds SET status=?,provider_refund=?,completed_at=? WHERE id=? AND status=\'reserved\'').bind(status,providerId,Date.now(),requestId).run()
 if(status==='succeeded')await syncAccounting(env,payment.proposal_id)
 return {id:requestId,proposalId:payment.proposal_id,status,message:status==='succeeded'?'Stripe confirmed the refund.':'Refund held for provider reconciliation. Check Stripe before taking further action.'}
}
