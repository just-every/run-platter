import type { Bindings } from '../auth.server'
import { currentTime } from './expiry-time'
import { need, fail } from './model'
import { queueReadyCompletionMail } from './completion-mail'
import { dispatchMail } from './mail'
import { createPaypalOrder, getPaypalOrder, capturePaypalOrder, paypalApproval, paypalCapture } from './paypal-provider'
import { paypalClient, paypalLive, paypalGuard, paypalWrite, paypalBinding } from './paypal-authority'

export async function paypalReceipt(env:Bindings,saved:any,order:any){
 const capture=paypalCapture(order,paypalBinding(saved)),db=env.DB
 need(!saved.capture_id||saved.capture_id===capture.id,'The PayPal capture identity changed',409)
 const owner=await db.prepare("SELECT id FROM oa_operators WHERE role='owner' AND status='active' ORDER BY id LIMIT 1").first<any>()
 need(owner,'An active owner is required to retain the payment receipt',409)
 await paypalWrite(env,saved,[
  db.prepare("INSERT INTO p_payment_records(id,proposal_id,revision,currency,cents,method,provider_charge,reference,recorded_by,recorded_at) VALUES(?,?,?,?,?,'paypal',?,?,?,?) ON CONFLICT(provider_charge) DO NOTHING").bind(saved.id,saved.proposal_id,saved.revision,'USD',saved.cents,capture.id,saved.merchant_id,owner.id,await currentTime(db)),
  db.prepare("UPDATE p_paypal_deposits SET status='succeeded',capture_id=?,updated_at=? WHERE id=?").bind(capture.id,await currentTime(db),saved.id),
 ])
 await queueReadyCompletionMail(env,saved.proposal_id);await dispatchMail(env,saved.proposal_id)
}
const result=(saved:any,policy:any,approvalUrl?:string)=>({status:saved.status,complete:policy.completion==='due'||saved.status==='succeeded',quote:{depositCents:saved.cents,feeCents:0,cents:saved.cents},authorization:saved.authorization,...(approvalUrl?{approvalUrl}:{})})

export async function clientPaypal(env:Bindings,c:any,input:Record<string,unknown>,action:'prepare'|'capture'|'status'){
 const {accepted,policy}=await paypalClient(env,c),db=env.DB
 let saved=await db.prepare('SELECT * FROM p_paypal_deposits WHERE proposal_id=? AND revision=?').bind(accepted.proposal_id,accepted.revision).first<any>()
 if(action!=='status')need((input.consent===true||input.consent==='yes')&&Number(input.cents)===accepted.deposit_cents&&(input.revision===undefined||Number(input.revision)===accepted.revision),'Review and authorize the exact revision-bound PayPal deposit',400)
 if(!saved){
  need(action==='prepare','Prepare the PayPal deposit first',409)
  const id=crypto.randomUUID(),at=await currentTime(db)
  saved={id,proposal_id:accepted.proposal_id,revision:accepted.revision,merchant_id:policy.merchantId,connection_version:policy.connectionVersion,cents:accepted.deposit_cents,currency:'USD',status:'reserved',create_request:crypto.randomUUID(),authorization:`I authorize a one-time PayPal deposit of ${(accepted.deposit_cents/100).toFixed(2)} USD for revision ${accepted.revision}. PayPal hosts approval. No future charges are authorized.`}
  try{
   await db.batch([
    db.prepare("INSERT INTO p_paypal_deposits(id,proposal_id,revision,merchant_id,connection_version,cents,currency,status,authorization,create_request,authorized_at,created_at,updated_at) VALUES(?,?,?,?,?,?,?,'reserved',?,?,?,?,?)").bind(id,saved.proposal_id,saved.revision,saved.merchant_id,saved.connection_version,saved.cents,'USD',saved.authorization,saved.create_request,at,at,at),
    db.prepare('INSERT INTO p_paypal_transport(deposit_id,share_token,session_hash) VALUES(?,?,?)').bind(id,c.token,c.share.session_hash),
    db.prepare('INSERT INTO p_guard(ok) VALUES(('+paypalGuard(saved,at).sql+'))').bind(...paypalGuard(saved,at).values),db.prepare('DELETE FROM p_guard'),
   ])
  }catch{fail('PayPal deposit preparation is already claimed or its authority changed. Refresh status.',409)}
  try{
   const {secret}=await paypalLive(env,saved),returnUrl=env.AUTH_ORIGIN+'/p/'+encodeURIComponent(c.token)+'/paypal-return'
   const order=await createPaypalOrder(secret,paypalBinding(saved),returnUrl,returnUrl,saved.create_request)
   await paypalClient(env,c)
   const approvalUrl=paypalApproval(order)
   await paypalWrite(env,saved,[db.prepare("UPDATE p_paypal_deposits SET order_id=?,status='created',updated_at=? WHERE id=?").bind(order.id,await currentTime(db),id)])
   saved={...saved,order_id:order.id,status:'created'}
   return result(saved,policy,approvalUrl)
  }catch(error){await db.prepare("UPDATE p_paypal_deposits SET status='needs_review',updated_at=? WHERE id=? AND status='reserved'").bind(await currentTime(db),id).run();throw error}
 }
 need(saved.merchant_id===policy.merchantId&&saved.connection_version===policy.connectionVersion&&saved.cents===accepted.deposit_cents,'The retained PayPal deposit changed',409)
 if(saved.status==='succeeded')return result(saved,policy)
 need(saved.order_id,'PayPal preparation is held for reconciliation. No automatic retry is permitted.',409)
 if(action==='prepare'){
  need(!saved.capture_request&&!['needs_review','reserved'].includes(saved.status),'This PayPal request is held for reconciliation',409)
  const {secret}=await paypalLive(env,saved),order=await getPaypalOrder(secret,paypalBinding(saved))
  await paypalClient(env,c);await paypalLive(env,saved)
  need(order.status!=='COMPLETED','Refresh the provider-confirmed capture before continuing',409)
  return result(saved,policy,paypalApproval(order))
 }
 // Reads reconcile a previously issued capture; they never create a new capture.
 const {secret}=await paypalLive(env,saved),order=await getPaypalOrder(secret,paypalBinding(saved))
 await paypalClient(env,c);await paypalLive(env,saved)
 if(order.status==='COMPLETED'){
  need(saved.capture_request,'This order has no authorized Platter capture request',409)
  await paypalReceipt(env,saved,order)
  return result({...saved,status:'succeeded'},policy)
 }
 if(action==='status'){
  const status=saved.capture_request?'needs_review':order.status==='APPROVED'?'approved':'created'
  await paypalWrite(env,saved,[db.prepare("UPDATE p_paypal_deposits SET status=?,updated_at=? WHERE id=? AND status!='succeeded'").bind(status,await currentTime(db),saved.id)])
  return result({...saved,status},policy)
 }
 need(order.status==='APPROVED','Approve this exact deposit on PayPal before capture',409)
 need(!saved.capture_request,'This capture is already claimed. Refresh status; do not retry.',409)
 const requestId=crypto.randomUUID()
 await paypalWrite(env,saved,[db.prepare("INSERT INTO p_guard(ok) VALUES(EXISTS(SELECT 1 FROM p_paypal_deposits WHERE id=? AND capture_request IS NULL AND status!='succeeded'))").bind(saved.id),db.prepare("UPDATE p_paypal_deposits SET capture_request=?,status='reserved',updated_at=? WHERE id=?").bind(requestId,await currentTime(db),saved.id)])
 saved={...saved,capture_request:requestId}
 try{
  const current=await paypalLive(env,saved),captured=await capturePaypalOrder(current.secret,paypalBinding(saved),requestId)
  await paypalClient(env,c);await paypalReceipt(env,saved,captured)
  return result({...saved,status:'succeeded'},policy)
 }catch{
  await db.prepare("UPDATE p_paypal_deposits SET status='needs_review',updated_at=? WHERE id=? AND status!='succeeded'").bind(await currentTime(db),saved.id).run()
  return result({...saved,status:'needs_review'},policy)
 }
}
