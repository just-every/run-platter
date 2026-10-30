import type { Bindings } from '../auth.server'
import { authority, commit, dollars, need, text, type Actor } from './model'
import { currentTime } from './expiry-time'
import { paypalBinding, paypalLive } from './paypal-authority'
import { getPaypalOrder, paypalCapture, refundPaypalCapture } from './paypal-provider'

export async function refundPaypal(env:Bindings,a:Actor,payment:any,input:Record<string,unknown>){
 need(['owner','admin','billing'].includes(a.role),'Only owner, admins and billing refund deposits',403)
 const db=env.DB,cents=dollars(input.amount),reason=text(input.reason,'a refund reason',1000),id=text(input.requestId,'an opaque refund request id',100)
 need(/^[A-Za-z0-9_-]+$/.test(id),'Use an opaque refund request id')
 need(input.consent===true||input.consent==='yes','Confirm this refund explicitly')
 const old=await db.prepare('SELECT * FROM p_refunds WHERE id=?').bind(id).first<any>()
 if(old){need(old.payment_id===payment.id&&old.cents===cents&&old.reason===reason,'This request identity already names a different refund',409);return{id,proposalId:payment.proposal_id,status:old.status}}
 const saved=await db.prepare('SELECT * FROM p_paypal_deposits WHERE id=? AND capture_id=? AND status=\'succeeded\'').bind(payment.id,payment.provider_charge).first<any>()
 need(saved&&payment.reference===saved.merchant_id&&payment.cents===saved.cents&&payment.currency===saved.currency,'The PayPal receipt does not match its deposit',409)
 const {guard}=await paypalLive(env,saved)
 await commit(db,a,[db.prepare("INSERT INTO p_refunds(id,payment_id,cents,reason,status,requested_by,requested_at) VALUES(?,?,?,?,'reserved',?,?)").bind(id,payment.id,cents,reason,a.id,await currentTime(db)),db.prepare('UPDATE p_payment_records SET version=version+1 WHERE id=?').bind(payment.id)],false,{sql:guard.sql+' AND EXISTS(SELECT 1 FROM p_payment_records WHERE id=? AND version=?) AND ?<=?-(SELECT COALESCE(SUM(cents),0) FROM p_refunds WHERE payment_id=?)',values:[...guard.values,payment.id,payment.version,cents,payment.cents,payment.id]})
 let status='needs_review',providerId:string|null=null
 try{
  // Recheck the acting credential as well as the selected merchant before every request.
  await db.batch([authority(db,a),db.prepare('DELETE FROM p_guard')])
  const {secret}=await paypalLive(env,saved),order=await getPaypalOrder(secret,paypalBinding(saved)),capture=paypalCapture(order,paypalBinding(saved))
  need(capture.id===payment.provider_charge,'The PayPal capture changed',409)
  await db.batch([authority(db,a),db.prepare('DELETE FROM p_guard')])
  const live=await paypalLive(env,saved),refund=await refundPaypalCapture(live.secret,{captureId:capture.id,cents,customId:id},id)
  await db.batch([authority(db,a),db.prepare('DELETE FROM p_guard')]);await paypalLive(env,saved)
  status=refund.status==='COMPLETED'?'succeeded':refund.status==='PENDING'?'pending_provider':'needs_review';providerId=refund.id
 }catch{/* The reserved amount remains held. There is no automatic refund retry. */}
 await db.prepare("UPDATE p_refunds SET status=?,provider_refund=?,completed_at=? WHERE id=? AND status='reserved'").bind(status,providerId,await currentTime(db),id).run()
 return {id,proposalId:payment.proposal_id,status,message:status==='succeeded'?'PayPal confirmed the refund.':'Refund held for provider reconciliation. Check PayPal before taking further action.'}
}
