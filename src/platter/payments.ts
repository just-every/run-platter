import { refundPaypal } from './paypal-refunds'
import type { Bindings } from '../auth.server'
import { providerCredential, providerJson } from './connections'
import { commit, dollars, need, text, type Actor } from './model'
const finance=['owner','admin','billing']
export async function paymentState(env:Bindings,a:Actor){
 if(!finance.includes(a.role))return []
 const refunds=(await env.DB.prepare('SELECT * FROM p_refunds ORDER BY requested_at,id').all<any>()).results
 return (await env.DB.prepare('SELECT * FROM p_payment_records ORDER BY recorded_at,id').all<any>()).results.map(p=>({...p,refunds:refunds.filter(r=>r.payment_id===p.id),heldCents:refunds.filter(r=>r.payment_id===p.id).reduce((n,r)=>n+r.cents,0)}))
}
async function chargeFor(env:Bindings,id:string){
 const {secret}=await providerCredential(env,'workspace:stripe'),charge=await providerJson('https://api.stripe.com/v1/charges/'+encodeURIComponent(id),secret.token)
 need(charge.id===id&&charge.paid===true&&charge.status==='succeeded'&&Number.isSafeInteger(charge.amount)&&charge.amount>0&&Number.isSafeInteger(charge.amount_refunded)&&charge.amount_refunded>=0&&charge.amount_refunded<=charge.amount,'Stripe did not confirm a refundable successful charge',409)
 return {charge,token:secret.token,accountId:secret.accountId}
}
export async function paymentCommand(env:Bindings,a:Actor,name:string,p:Record<string,unknown>){
 need(finance.includes(a.role),'Only owner, admins and billing manage payments and refunds',403)
 const db=env.DB
 if(name==='payment.record'){
  const id=text(p.id,'a proposal'),accepted=await db.prepare('SELECT * FROM p_acceptances WHERE proposal_id=?').bind(id).first<any>();need(accepted,'Accept the proposal before recording payment',409)
  const method=String(p.method);need(['check','wire','ach_credit'].includes(method),'Choose check, wire or ACH credit')
  const receivedOn=text(p.receivedOn,'the payment date',10);need(/^\d{4}-\d{2}-\d{2}$/.test(receivedOn)&&Number.isFinite(Date.parse(receivedOn+'T00:00:00Z'))&&new Date(receivedOn+'T00:00:00Z').toISOString().slice(0,10)===receivedOn,'Use a valid payment date')
  const cents=dollars(p.amount,'a payment amount'),reference=text(p.reference,'a payment reference',200),recordId=crypto.randomUUID()
  need(p.consent===true||p.consent==='yes','Confirm that the money was received')
  await commit(db,a,[db.prepare('INSERT INTO p_payment_records(id,proposal_id,revision,currency,cents,method,reference,received_on,recorded_by,recorded_at) VALUES(?,?,?,?,?,?,?,?,?,?)').bind(recordId,id,accepted.revision,accepted.currency,cents,method,reference,receivedOn,a.id,Date.now())])
  return {id:recordId,proposalId:id,recorded:true}
 }
 if(name==='payment.bind'){
  const id=text(p.id,'a proposal'),accepted=await db.prepare('SELECT * FROM p_acceptances WHERE proposal_id=?').bind(id).first<any>();need(accepted,'Accept the proposal before linking its deposit',409)
  need(p.consent===true||p.consent==='yes','Confirm this Stripe charge belongs to the accepted deposit')
  const chargeId=text(p.chargeId,'the Stripe charge id',200),{charge,accountId}=await chargeFor(env,chargeId)
  need(charge.currency?.toUpperCase()===accepted.currency&&charge.amount===accepted.deposit_cents&&charge.metadata?.platter_proposal_id===id&&String(charge.metadata?.platter_revision)===String(accepted.revision),'The verified Stripe charge must match this accepted deposit, currency and revision',409)
  const old=await db.prepare('SELECT * FROM p_payment_records WHERE provider_charge=?').bind(chargeId).first<any>();if(old){need(old.proposal_id===id,'Charge already belongs to another proposal',409);return{id:old.id,proposalId:id}}
  const recordId=crypto.randomUUID()
  await commit(db,a,[db.prepare("INSERT INTO p_payment_records(id,proposal_id,revision,currency,cents,method,provider_charge,reference,recorded_by,recorded_at) VALUES(?,?,?,?,?,'stripe',?,?,?,?)").bind(recordId,id,accepted.revision,accepted.currency,accepted.deposit_cents,chargeId,accountId,a.id,Date.now())])
  return {id:recordId,proposalId:id}
 }
 need(name==='payment.refund','Unknown payment action',404)
 const payment=await db.prepare('SELECT * FROM p_payment_records WHERE id=?').bind(text(p.paymentId,'a payment')).first<any>();if(payment?.method==='paypal')return refundPaypal(env,a,payment,p)
 need(payment&&payment.method==='stripe','Choose a linked Stripe deposit',404)
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
 return {id:requestId,proposalId:payment.proposal_id,status,message:status==='succeeded'?'Stripe confirmed the refund.':'Refund held for provider reconciliation. Check Stripe before taking further action.'}
}
