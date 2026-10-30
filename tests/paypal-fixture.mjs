import assert from 'node:assert/strict'

export const paypalToken='synthetic-platter-9001'
export const paypalMerchant='synthetic-platter-merchant'
export const paypalWebhook='synthetic-platter-webhook'
export const paypalHeaders={
 'paypal-transmission-id':'synthetic-platter-9002',
 'paypal-transmission-time':'2030-06-01T15:00:00Z',
 'paypal-transmission-sig':'synthetic-platter-9003',
 'paypal-cert-url':'https://api.paypal.com/v1/notifications/certs/synthetic-platter-9004',
 'paypal-auth-algo':'SHA256withRSA',
}

// Only the remote provider is synthetic. Every entry records the real Worker request.
export function paypalFixture(){
 const calls=[],orders=new Map(),captures=new Map(),refunds=new Map(),uncertain=new Set()
 let verification='SUCCESS',hook,sequence=9010
 const next=()=> 'synthetic-platter-'+(++sequence)
 const outboundService=async request=>{
  const url=new URL(request.url),body=request.method==='GET'?undefined:await request.json()
  const call={url:url.href,method:request.method,headers:Object.fromEntries(request.headers),body}
  calls.push(call)
  assert.equal(url.hostname,'api-m.paypal.com')
  assert.equal(request.headers.get('authorization'),'Bearer '+paypalToken)
  if(hook)await hook(call)
  if(url.pathname==='/v1/identity/openidconnect/userinfo'){
   assert.equal(request.method,'GET');assert.equal(url.searchParams.get('schema'),'openid')
   return Response.json({payer_id:paypalMerchant,verified_account:true})
  }
  if(url.pathname==='/v1/notifications/verify-webhook-signature'){
   assert.equal(request.method,'POST')
   return Response.json({verification_status:verification})
  }
  if(url.pathname==='/v2/checkout/orders'&&request.method==='POST'){
   const id=next(),unit=structuredClone(body.purchase_units[0]),order={id,status:'CREATED',intent:'CAPTURE',purchase_units:[unit],links:[{rel:'payer-action',href:'https://www.paypal.com/checkoutnow?token='+id,method:'GET'}]}
   orders.set(id,order)
   if(uncertain.has('create'))return new Response('synthetic-platter-9080',{status:503})
   return Response.json(order,{status:201})
  }
  const orderMatch=url.pathname.match(/^\/v2\/checkout\/orders\/([^/]+)(\/capture)?$/)
  if(orderMatch){
   const order=orders.get(orderMatch[1]);assert.ok(order,'PayPal request names a real prepared order')
   if(orderMatch[2]){
    assert.equal(request.method,'POST');assert.equal(order.status,'APPROVED')
    const capture={id:next(),status:'COMPLETED',amount:structuredClone(order.purchase_units[0].amount),payee:{merchant_id:paypalMerchant},supplementary_data:{related_ids:{order_id:order.id}},final_capture:true,links:[{rel:'up',href:'https://api-m.paypal.com/v2/checkout/orders/'+order.id}]}
    captures.set(capture.id,capture);order.status='COMPLETED';order.purchase_units[0].payments={captures:[capture]}
    if(uncertain.has('capture'))return new Response('synthetic-platter-9080',{status:503})
    return Response.json({id:order.id,status:order.status,purchase_units:[{reference_id:order.purchase_units[0].reference_id,payments:order.purchase_units[0].payments}]})
   }else assert.equal(request.method,'GET')
   return Response.json(order)
  }
  const captureMatch=url.pathname.match(/^\/v2\/payments\/captures\/([^/]+)(\/refund)?$/)
  if(captureMatch){
   const capture=captures.get(captureMatch[1]);assert.ok(capture,'PayPal request names the verified capture')
   if(captureMatch[2]){
    assert.equal(request.method,'POST')
    const refund={id:next(),status:'COMPLETED',amount:structuredClone(body.amount),...(body.custom_id?{custom_id:body.custom_id}:{}),links:[{rel:'up',href:'https://api-m.paypal.com/v2/payments/captures/'+capture.id,method:'GET'}]}
    refunds.set(refund.id,refund)
    if(uncertain.has('refund'))return new Response('synthetic-platter-9080',{status:503})
    return Response.json(refund,{status:201})
   }
   assert.equal(request.method,'GET');return Response.json(capture)
  }
  assert.fail('Unexpected PayPal request '+request.method+' '+url.pathname)
 }
 const event=(capture,id=next())=>({id,event_type:'PAYMENT.CAPTURE.COMPLETED',resource:structuredClone(capture)})
 return {calls,orders,captures,refunds,outboundService,event,approve:id=>{assert.ok(orders.has(id));orders.get(id).status='APPROVED'},setVerification:value=>{verification=value},setUncertain:(kind,value=true)=>{if(value)uncertain.add(kind);else uncertain.delete(kind)},setHook:value=>{hook=value}}
}
