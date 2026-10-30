import type { Bindings } from '../auth.server'
import { hash, need, text } from './model'
import { currentTime } from './expiry-time'
import { paypalCents, getPaypalOrder, paypalCapture, verifyPaypalWebhook } from './paypal-provider'
import { paypalBinding, paypalLive, paypalWrite } from './paypal-authority'
import { paypalReceipt } from './paypal'

export async function paypalEvent(env:Bindings,request:Request){
 need(request.method==='POST','Use a PayPal notification submission',405)
 const raw=await request.text();need(new TextEncoder().encode(raw).length<=65536,'PayPal notification too large',413)
 let event:any;try{event=JSON.parse(raw)}catch{need(false,'Invalid PayPal notification')}
 need(event?.event_type==='PAYMENT.CAPTURE.COMPLETED','Unsupported PayPal notification',400)
 const id=text(event.id,'the PayPal event identity',200),resource=event.resource
 const orderId=resource?.supplementary_data?.related_ids?.order_id
 need(typeof orderId==='string'&&resource?.status==='COMPLETED','PayPal did not identify a completed order capture',400)
 const db=env.DB,saved=await db.prepare('SELECT * FROM p_paypal_deposits WHERE order_id=?').bind(orderId).first<any>()
 need(saved?.capture_request,'No authorized capture matches this notification',409)
 need(resource.payee?.merchant_id===saved.merchant_id&&paypalCents(resource.amount)===saved.cents&&(!saved.capture_id||saved.capture_id===resource.id),'Foreign PayPal notification refused',400)
 const digest=await hash(raw),previous=await db.prepare('SELECT * FROM p_paypal_events WHERE id=?').bind(id).first<any>()
 if(previous){
  need(previous.deposit_id===saved.id&&previous.event_hash===digest,'This PayPal event identity names a different notification',409)
  if(previous.status==='applied')return {received:true,replayed:true}
  need(previous.status==='rejected','This PayPal event is already claimed or held for reconciliation',409)
 }
 await paypalLive(env,saved)
 try{
  await paypalWrite(env,saved,[...(previous?[db.prepare("INSERT INTO p_guard(ok) VALUES(EXISTS(SELECT 1 FROM p_paypal_events WHERE id=? AND status='rejected'))").bind(id)]:[]),db.prepare(previous?"UPDATE p_paypal_events SET status='verifying' WHERE id=? AND status='rejected'":"INSERT INTO p_paypal_events(id,deposit_id,merchant_id,event_hash,status,received_at) VALUES(?,?,?,?,'verifying',?)").bind(...(previous?[id]:[id,saved.id,saved.merchant_id,digest,await currentTime(db)]))])
 }catch{need(false,'This PayPal notification is already claimed',409)}
 try{
  const {secret}=await paypalLive(env,saved)
  await verifyPaypalWebhook(secret,request.headers,event)
 }catch(error){await db.prepare("UPDATE p_paypal_events SET status='rejected' WHERE id=?").bind(id).run();throw error}
 try{
  const {secret}=await paypalLive(env,saved),order=await getPaypalOrder(secret,paypalBinding(saved)),capture=paypalCapture(order,paypalBinding(saved))
  need(capture.id===resource.id,'PayPal notification capture does not match its order',400)
  await paypalReceipt(env,saved,order)
  await paypalWrite(env,saved,[db.prepare("UPDATE p_paypal_events SET status='applied' WHERE id=?").bind(id)])
 }catch(error){await db.prepare("UPDATE p_paypal_events SET status='needs_review' WHERE id=?").bind(id).run();throw error}
 return {received:true}
}
