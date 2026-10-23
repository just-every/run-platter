import type { Bindings } from '../../auth.server'
import { providerCredential, providerJson } from '../connections'
import { hash, need } from '../model'
import { syncAccounting } from '../accounting/quickbooks'
import { ensureAmounts } from '../accounting/amounts'
const hex=(bytes:ArrayBuffer)=>Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('')
async function signed(raw:string,header:string,secret:string){
 const fields=header.split(',').map(v=>v.split('=')),timestamp=fields.find(v=>v[0]==='t')?.[1],signatures=fields.filter(v=>v[0]==='v1').map(v=>v[1])
 need(timestamp&&/^\d+$/.test(timestamp)&&Math.abs(Date.now()/1000-Number(timestamp))<=300,'Stripe signature timestamp is invalid',401)
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']),expected=hex(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(timestamp+'.'+raw)))
 need(signatures.some(s=>{if(s.length!==expected.length)return false;let mismatch=0;for(let i=0;i<s.length;i++)mismatch|=s.charCodeAt(i)^expected.charCodeAt(i);return mismatch===0}),'Stripe signature is invalid',401)
}
const types=new Set(['payment_intent.processing','payment_intent.succeeded','payment_intent.payment_failed','charge.succeeded','charge.failed','charge.refunded','charge.dispute.created','charge.dispute.updated','charge.dispute.closed'])
export async function stripeEvents(request:Request,env:Bindings){
 need(request.method==='POST','Use a signed Stripe POST',405)
 const raw=await request.text();need(new TextEncoder().encode(raw).length<=262144,'Stripe event is too large',413)
 const {secret}=await providerCredential(env,'workspace:stripe')
 await signed(raw,request.headers.get('stripe-signature')??'',secret.webhookSecret)
 let event:any;try{event=JSON.parse(raw)}catch{need(false,'Invalid Stripe event')}
 need(event&&typeof event.id==='string'&&event.id.length<=200&&Number.isSafeInteger(event.created)&&event.created>=0&&typeof event.type==='string','Invalid Stripe event')
 need(!event.account||event.account===secret.accountId,'Stripe event belongs to another connected account',403)
 if(!types.has(event.type))return Response.json({ignored:true})
 need(typeof event.data?.object?.id==='string'&&event.data.object.id.length<=200,'Stripe event has no object')
 const db=env.DB,digest=await hash(raw),prior=await db.prepare('SELECT * FROM p_financial_events WHERE id=?').bind(event.id).first<any>()
 if(prior){need(prior.account_id===secret.accountId&&prior.body_hash===digest,'Stripe event id was reused for different evidence',409);return Response.json({received:true,state:prior.state})}
 const claimed=await db.prepare("INSERT OR IGNORE INTO p_financial_events(id,account_id,event_type,object_id,created_at,received_at,body_hash,state) VALUES(?,?,?,?,?,?,?,'claimed')").bind(event.id,secret.accountId,event.type,event.data.object.id,event.created,Date.now(),digest).run()
 if(!claimed.meta.changes)return Response.json({received:true})
 try{await applyEvent(env,event.id);return Response.json({received:true,state:'processed'})}catch{await db.prepare("UPDATE p_financial_events SET state='held' WHERE id=?").bind(event.id).run();return Response.json({received:true,state:'held'})}
}
export async function applyEvent(env:Bindings,eventId:string){
 const db=env.DB,event=await db.prepare('SELECT * FROM p_financial_events WHERE id=?').bind(eventId).first<any>(),{secret,connection}=await providerCredential(env,'workspace:stripe')
 need(event&&event.account_id===secret.accountId,'Reconnect the original Stripe account',409)
 let source:any,dispute:any
 if(event.event_type.startsWith('charge.dispute.')){
  dispute=await providerJson('https://api.stripe.com/v1/disputes/'+encodeURIComponent(event.object_id),secret.token)
  need(dispute.id===event.object_id&&typeof dispute.charge==='string','Stripe dispute binding is invalid',409)
  source=await providerJson('https://api.stripe.com/v1/charges/'+encodeURIComponent(dispute.charge),secret.token)
 }else source=await providerJson('https://api.stripe.com/v1/'+(event.event_type.startsWith('payment_intent.')?'payment_intents/':'charges/')+encodeURIComponent(event.object_id),secret.token)
 need(source&&typeof source.id==='string','Stripe did not confirm the payment',409)
 if(!dispute)need(source.id===event.object_id&&source.object===(event.event_type.startsWith('payment_intent.')?'payment_intent':'charge'),'Stripe returned a different payment object',409)
 if(event.event_type.startsWith('payment_intent.')&&source.latest_charge){
  const charge=await providerJson('https://api.stripe.com/v1/charges/'+encodeURIComponent(typeof source.latest_charge==='string'?source.latest_charge:source.latest_charge.id),secret.token)
  need(charge.object==='charge'&&charge.id===(typeof source.latest_charge==='string'?source.latest_charge:source.latest_charge.id)&&charge.payment_intent===source.id,'Stripe charge does not belong to this payment',409)
  source=charge
 }
 const metadata=source.metadata??{},amountId=metadata.platter_amount_id,proposalId=metadata.platter_proposal_id
 need(typeof amountId==='string'&&typeof proposalId==='string','Stripe payment is not bound to a scheduled amount',409)
 await ensureAmounts(env,proposalId)
 const amount=await db.prepare('SELECT a.*,p.revision FROM p_amounts a JOIN p_acceptances p ON p.proposal_id=a.proposal_id WHERE a.id=?').bind(amountId).first<any>()
 need(amount&&amount.proposal_id===proposalId&&String(amount.revision)===String(metadata.platter_revision)&&source.currency?.toUpperCase()===amount.currency&&Number.isSafeInteger(source.amount)&&source.amount>0&&source.amount<=amount.cents,'Stripe payment does not match the accepted amount, currency and revision',409)
 const refunded=source.amount_refunded??0
 need(Number.isSafeInteger(refunded)&&refunded>=0&&refunded<=source.amount,'Stripe refund amount is invalid',409)
 const canonical=source.payment_intent??source.id,chargeId=source.object==='charge'?source.id:null
 const prior=await db.prepare('SELECT * FROM p_provider_payments WHERE id=?').bind(canonical).first<any>();need(!prior||prior.account_id===secret.accountId&&prior.amount_id===amountId,'Provider payment binding changed',409)
 if(dispute)need(dispute.object==='dispute'&&dispute.charge===chargeId&&dispute.currency===source.currency&&Number.isSafeInteger(dispute.amount)&&dispute.amount>0&&dispute.amount<=source.amount&&['warning_needs_response','warning_under_review','warning_closed','needs_response','under_review','charge_refunded','won','lost'].includes(dispute.status),'Stripe dispute does not match the payment',409)
 const disputeStatus=dispute?.status??prior?.dispute_status??null,disputed=disputeStatus?disputeStatus!=='won':Boolean(source.disputed)
 const succeeded=source.object==='charge'?source.paid===true&&source.status==='succeeded'&&source.captured===true:source.status==='succeeded'
 const state=disputed?'disputed':refunded===source.amount?'refunded':refunded>0?'partially_refunded':succeeded?'succeeded':['processing','pending','requires_action','requires_capture'].includes(source.status)||source.status==='succeeded'&&source.captured===false?'processing':'failed'
 const writes=[
  db.prepare("INSERT INTO p_provider_payments(id,account_id,amount_id,charge_id,state,cents,refunded_cents,dispute_status,last_event) VALUES(?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET charge_id=COALESCE(excluded.charge_id,p_provider_payments.charge_id),state=excluded.state,cents=excluded.cents,refunded_cents=excluded.refunded_cents,dispute_status=COALESCE(excluded.dispute_status,p_provider_payments.dispute_status),last_event=excluded.last_event WHERE excluded.account_id=p_provider_payments.account_id AND excluded.amount_id=p_provider_payments.amount_id AND (SELECT created_at FROM p_financial_events WHERE id=excluded.last_event)>=(SELECT created_at FROM p_financial_events WHERE id=p_provider_payments.last_event)").bind(canonical,secret.accountId,amountId,chargeId,state,source.amount,refunded,disputeStatus,eventId),
  db.prepare("UPDATE p_financial_events SET state='processed',amount_id=?,payment_state=? WHERE id=?").bind(amountId,state,eventId),
  db.prepare('UPDATE p_amounts SET version=version+1 WHERE id=?').bind(amountId),
 ]
 if(chargeId&&['succeeded','partially_refunded','refunded','disputed'].includes(state)){
  const paymentId='stripe:'+chargeId
  writes.push(db.prepare("INSERT OR IGNORE INTO p_payment_records(id,proposal_id,revision,currency,cents,method,provider_charge,reference,recorded_by,recorded_at) VALUES(?,?,?,?,?,'stripe',?,?,?,?)").bind(paymentId,proposalId,amount.revision,amount.currency,source.amount,chargeId,secret.accountId,connection.connected_by,Date.now()))
  // Existing verified bindings keep their stable id.
  writes.push(db.prepare('INSERT OR IGNORE INTO p_payment_allocations(payment_id,amount_id,cents) SELECT id,?,cents FROM p_payment_records WHERE provider_charge=? AND proposal_id=?').bind(amountId,chargeId,proposalId))
 }
 await db.batch(writes)
 await syncAccounting(env,proposalId)
}
