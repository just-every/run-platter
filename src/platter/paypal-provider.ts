import { fail, need } from './model'

export type PaypalSecret = { token:string; accountId?:string; webhookId?:string }
export type PaypalOrderBinding = { orderId?:string; referenceId:string; merchantId:string; cents:number; currency?:string }
export type PaypalRefundBinding = { captureId:string; cents:number; refundId?:string; customId?:string }
const api='https://api-m.paypal.com'
const opaque=(value:unknown,max=200):value is string=>typeof value==='string'&&value.length>0&&value.length<=max&&/^[A-Za-z0-9_-]+$/.test(value)
const object=(value:any)=>value!==null&&typeof value==='object'&&!Array.isArray(value)

/** Every caller must obtain the sealed connection again after checking live authority. */
export async function requestPaypal(secret:PaypalSecret,path:string,body?:unknown,requestId?:string):Promise<any>{
 need(typeof secret.token==='string'&&secret.token.length>0&&secret.token.length<=8192&&!/[\s\0]/.test(secret.token),'Connect PayPal again before continuing',409)
 const read=body===undefined
 const permitted=read
  ? /^\/v2\/checkout\/orders\/[A-Za-z0-9_-]{1,200}$|^\/v2\/payments\/(?:captures|refunds)\/[A-Za-z0-9_-]{1,200}$|^\/v1\/identity\/openidconnect\/userinfo\?schema=openid$/
  : /^\/v2\/checkout\/orders(?:\/[A-Za-z0-9_-]{1,200}\/capture)?$|^\/v2\/payments\/captures\/[A-Za-z0-9_-]{1,200}\/refund$|^\/v1\/notifications\/verify-webhook-signature$/
 need(permitted.test(path),'Unsupported PayPal request',409)
 need(requestId===undefined||opaque(requestId,108),'Use an opaque PayPal request id',409)
 need(read||path==='/v1/notifications/verify-webhook-signature'||requestId!==undefined,'PayPal payment writes require a retained request id',409)
 try{
  const headers:Record<string,string>={authorization:'Bearer '+secret.token,accept:'application/json'}
  if(!read){headers['content-type']='application/json';headers.prefer='return=representation'}
  if(requestId!==undefined)headers['PayPal-Request-Id']=requestId
  const response=await fetch(api+path,{method:read?'GET':'POST',headers,body:read?undefined:JSON.stringify(body),redirect:'manual',signal:AbortSignal.timeout(15000)})
  need(response.ok&&response.body,'PayPal request failed',409)
  const reader=response.body.getReader(),chunks:Uint8Array[]=[]
  let length=0
  for(;;){
   const part=await reader.read();if(part.done)break
   length+=part.value.byteLength
   if(length>262144){await reader.cancel();fail('PayPal response exceeded the limit',409)}
   chunks.push(part.value)
  }
  const bytes=new Uint8Array(length);let offset=0
  for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength}
  const value=JSON.parse(new TextDecoder().decode(bytes));need(object(value),'Invalid PayPal response',409)
  return value
 }catch{fail('PayPal did not confirm the request. Reconcile before any further payment action.',409)}
}

/** PayPal subject IDs are not merchant IDs; only the explicit account payer identifier binds. */
export async function verifyPaypalMerchant(token:string,merchantId:string){
 need(opaque(merchantId),'Use the PayPal merchant account id',400)
 const profile=await requestPaypal({token},'/v1/identity/openidconnect/userinfo?schema=openid')
 need(profile.payer_id===merchantId&&profile.verified_account===true,'PayPal did not confirm this verified merchant account. Use a token with account identity permission.',409)
 return merchantId
}

export function paypalAmount(cents:number){
 need(Number.isSafeInteger(cents)&&cents>0,'Use a positive PayPal amount in cents',409)
 return {currency_code:'USD',value:Math.floor(cents/100)+'.'+String(cents%100).padStart(2,'0')}
}
export function paypalCents(amount:any){
 need(object(amount)&&amount.currency_code==='USD'&&typeof amount.value==='string'&&/^(?:0|[1-9][0-9]*)(?:\.[0-9]{1,2})?$/.test(amount.value),'PayPal returned an invalid USD amount',409)
 const [whole,fraction='']=amount.value.split('.'),cents=Number(whole)*100+Number(fraction.padEnd(2,'0'))
 need(Number.isSafeInteger(cents)&&cents>0,'PayPal returned an invalid USD amount',409)
 return cents
}
function checkBinding(binding:PaypalOrderBinding){
 need(opaque(binding.referenceId,256)&&opaque(binding.merchantId)&&(binding.orderId===undefined||opaque(binding.orderId)),'PayPal order binding is invalid',409)
 need(binding.currency===undefined||binding.currency==='USD','PayPal deposits require USD',409)
 paypalAmount(binding.cents)
}

/** Validate the complete resource before trusting its approval or embedded payments. */
export function validatePaypalOrder(order:any,binding:PaypalOrderBinding){
 checkBinding(binding)
 need(object(order)&&opaque(order.id)&&(binding.orderId===undefined||order.id===binding.orderId)&&order.intent==='CAPTURE','PayPal order identity changed',409)
 need(['CREATED','PAYER_ACTION_REQUIRED','APPROVED','COMPLETED'].includes(order.status),'PayPal order is not available for this deposit',409)
 need(Array.isArray(order.purchase_units)&&order.purchase_units.length===1,'PayPal order must contain one deposit',409)
 const unit=order.purchase_units[0]
 need(object(unit)&&unit.reference_id===binding.referenceId&&unit.payee?.merchant_id===binding.merchantId&&paypalCents(unit.amount)===binding.cents,'PayPal order does not match the retained deposit and merchant',409)
 return order
}

export function paypalApproval(order:any){
 need(object(order)&&opaque(order.id)&&Array.isArray(order.links),'PayPal did not return an approval link',409)
 const links=order.links.filter((link:any)=>link?.rel==='approve'||link?.rel==='payer-action')
 need(links.length===1&&links[0].method==='GET'&&typeof links[0].href==='string'&&links[0].href.length<=2048,'PayPal did not return one approval link',409)
 let url:URL
 try{url=new URL(links[0].href)}catch{fail('PayPal returned an invalid approval link',409)}
 need(url.protocol==='https:'&&url.hostname==='www.paypal.com'&&!url.port&&!url.username&&!url.password&&!url.hash&&url.pathname==='/checkoutnow'&&url.searchParams.getAll('token').length===1&&url.searchParams.get('token')===order.id&&Array.from(url.searchParams.keys()).every(key=>key==='token'),'PayPal returned an invalid approval link',409)
 return url.href
}

/** A deposit is paid only by a single completed final capture for its exact amount. */
export function paypalCapture(order:any,binding:PaypalOrderBinding){
 checkBinding(binding)
 need(opaque(binding.orderId)&&object(order)&&order.id===binding.orderId&&order.status==='COMPLETED'&&Array.isArray(order.purchase_units)&&order.purchase_units.length===1,'PayPal did not confirm the retained order capture',409)
 const unit=order.purchase_units[0]
 need(object(unit)&&unit.reference_id===binding.referenceId,'PayPal capture reference changed',409)
 // Capture replies omit these order details; the caller validates the full order before capture.
 if(order.intent!==undefined)need(order.intent==='CAPTURE','PayPal order intent changed',409)
 if(unit.amount!==undefined)need(paypalCents(unit.amount)===binding.cents,'PayPal order amount changed',409)
 if(unit.payee!==undefined)need(unit.payee?.merchant_id===binding.merchantId,'PayPal merchant changed',409)
 const payments=order.purchase_units[0].payments
 need(order.status==='COMPLETED'&&object(payments)&&Array.isArray(payments.captures)&&payments.captures.length===1&&!payments.authorizations?.length,'PayPal did not confirm one completed deposit capture',409)
 const capture=payments.captures[0]
 need(object(capture)&&opaque(capture.id)&&capture.status==='COMPLETED'&&capture.final_capture===true&&paypalCents(capture.amount)===binding.cents,'PayPal did not confirm the completed deposit amount',409)
 if(capture.supplementary_data?.related_ids?.order_id!==undefined)need(capture.supplementary_data.related_ids.order_id===order.id,'PayPal capture belongs to another order',409)
 return capture
}

function captureLink(links:any,captureId:string){
 need(Array.isArray(links),'PayPal did not identify the refunded capture',409)
 const up=links.filter((link:any)=>link?.rel==='up')
 need(up.length===1&&up[0].method==='GET'&&typeof up[0].href==='string','PayPal did not identify one refunded capture',409)
 let url:URL
 try{url=new URL(up[0].href)}catch{fail('PayPal returned an invalid capture binding',409)}
 need(url.protocol==='https:'&&['api-m.paypal.com','api.paypal.com'].includes(url.hostname)&&!url.port&&!url.username&&!url.password&&!url.search&&!url.hash&&url.pathname==='/v2/payments/captures/'+captureId,'PayPal refund belongs to another capture',409)
}
function checkRefundBinding(binding:PaypalRefundBinding){
 need(opaque(binding.captureId)&&(binding.refundId===undefined||opaque(binding.refundId))&&(binding.customId===undefined||opaque(binding.customId,127)),'PayPal refund binding is invalid',409)
 paypalAmount(binding.cents)
}
export function validatePaypalRefund(refund:any,binding:PaypalRefundBinding){
 checkRefundBinding(binding)
 need(object(refund)&&opaque(refund.id)&&(binding.refundId===undefined||refund.id===binding.refundId)&&paypalCents(refund.amount)===binding.cents,'PayPal refund does not match the retained request',409)
 need(['COMPLETED','PENDING','FAILED','CANCELLED'].includes(refund.status),'PayPal refund status is unavailable',409)
 if(binding.customId!==undefined)need(refund.custom_id===binding.customId,'PayPal refund reference changed',409)
 captureLink(refund.links,binding.captureId)
 return refund
}

export async function createPaypalOrder(secret:PaypalSecret,binding:PaypalOrderBinding,returnUrl:string,cancelUrl:string,requestId:string){
 checkBinding(binding)
 need(secret.accountId===undefined||secret.accountId===binding.merchantId,'PayPal connection merchant changed',409)
 for(const value of [returnUrl,cancelUrl]){
  let url:URL;try{url=new URL(value)}catch{fail('Use a valid PayPal return address',409)}
  need(url.protocol==='https:'&&!url.username&&!url.password&&!url.hash,'Use a secure PayPal return address',409)
 }
 const order=await requestPaypal(secret,'/v2/checkout/orders',{intent:'CAPTURE',purchase_units:[{reference_id:binding.referenceId,payee:{merchant_id:binding.merchantId},amount:paypalAmount(binding.cents)}],payment_source:{paypal:{experience_context:{return_url:returnUrl,cancel_url:cancelUrl,user_action:'PAY_NOW',shipping_preference:'NO_SHIPPING'}}}},requestId)
 return validatePaypalOrder(order,binding)
}
export async function getPaypalOrder(secret:PaypalSecret,binding:PaypalOrderBinding){
 need(opaque(binding.orderId),'PayPal order id is required',409);checkBinding(binding)
 need(secret.accountId===undefined||secret.accountId===binding.merchantId,'PayPal connection merchant changed',409)
 return validatePaypalOrder(await requestPaypal(secret,'/v2/checkout/orders/'+binding.orderId),binding)
}
export async function capturePaypalOrder(secret:PaypalSecret,binding:PaypalOrderBinding,requestId:string){
 need(opaque(binding.orderId),'PayPal order id is required',409);checkBinding(binding)
 need(secret.accountId===undefined||secret.accountId===binding.merchantId,'PayPal connection merchant changed',409)
 const order=await requestPaypal(secret,'/v2/checkout/orders/'+binding.orderId+'/capture',{},requestId)
 paypalCapture(order,binding)
 return order
}
export async function refundPaypalCapture(secret:PaypalSecret,binding:PaypalRefundBinding,requestId:string){
 need(opaque(binding.captureId)&&opaque(requestId,108),'PayPal capture and request ids are required',409)
 checkRefundBinding(binding)
 const refund=await requestPaypal(secret,'/v2/payments/captures/'+binding.captureId+'/refund',{amount:paypalAmount(binding.cents),...(binding.customId===undefined?{}:{custom_id:binding.customId})},requestId)
 return validatePaypalRefund(refund,binding)
}

/** The incoming event must be passed unchanged, using the connection's configured webhook id. */
export async function verifyPaypalWebhook(secret:PaypalSecret,headers:Headers,event:unknown){
 need(opaque(secret.webhookId,50)&&object(event),'PayPal webhook verification is unavailable',409)
 const required=(name:string,max:number)=>{const value=headers.get(name);need(value&&value.trim().length>0&&value.length<=max&&!/[\r\n\0]/.test(value),'PayPal webhook transmission headers are required',400);return value}
 const body={webhook_id:secret.webhookId,webhook_event:event,auth_algo:required('paypal-auth-algo',100),cert_url:required('paypal-cert-url',500),transmission_id:required('paypal-transmission-id',50),transmission_sig:required('paypal-transmission-sig',500),transmission_time:required('paypal-transmission-time',100)}
 const result=await requestPaypal(secret,'/v1/notifications/verify-webhook-signature',body)
 need(result.verification_status==='SUCCESS','PayPal did not verify this webhook signature',400)
}
