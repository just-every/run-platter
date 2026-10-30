import { currentTime } from './expiry-time'
import { queueReadyCompletionMail } from './completion-mail'
import { dispatchMail } from './mail'
import { collectionQuote } from './collection-fees'
import type { Bindings } from '../auth.server'
import { providerCredential } from './connections'
import { collectionPolicy } from './collection-policy'
import { need, fail } from './model'

export async function collectionView(db:D1Database,id:string,accepted?:any){
 const frozen=accepted?JSON.parse(accepted.snapshot).collectionPolicy:null
 const policy=accepted?(frozen??{enabled:false,completion:'off',methods:[]}):await collectionPolicy(db,id)
 const paypal=policy.provider==='paypal'
 const intent=paypal?await db.prepare('SELECT status,cents,cents AS deposit_cents,0 AS fee_cents,currency,authorization,authorized_at FROM p_paypal_deposits WHERE proposal_id=? AND revision=?').bind(id,accepted?.revision??0).first<any>():await db.prepare('SELECT method,status,cents,deposit_cents,fee_cents,billing_state,currency,authorization,authorized_at,provider_mandate FROM p_collection_intents WHERE proposal_id=? AND revision=?').bind(id,accepted?.revision??0).first<any>()
 return {...policy,payment:intent,agreementState:!accepted?'unsigned':!policy.enabled||policy.completion==='due'||accepted.deposit_cents===0||intent?.status==='succeeded'&&Boolean(intent.authorized_at)?'complete':'waiting_for_payment',complete:!policy.enabled||policy.completion==='due'||accepted?.deposit_cents===0||intent?.status==='succeeded'&&Boolean(intent.authorized_at)}
}

async function stripe(token:string,path:string,body?:URLSearchParams,idempotency?:string){
 try{
  const response=await fetch('https://api.stripe.com/v1/'+path,{method:body?'POST':'GET',redirect:'manual',headers:{authorization:'Bearer '+token,...(body?{'content-type':'application/x-www-form-urlencoded'}:{}),...(idempotency?{'idempotency-key':idempotency}:{})},...(body?{body}:{}),signal:AbortSignal.timeout(20000)})
  need(response.ok,'Stripe could not prepare this payment. Contact the firm.',409)
  return await response.json() as any
 }catch{fail('Stripe could not confirm this payment. Refresh its status before trying again.',409)}
}

async function boundClient(env:Bindings,c:any){
 need(c.verified,'Verify your email before paying',401)
 const row=await env.DB.prepare('SELECT a.* FROM p_acceptances a JOIN p_proposals p ON p.id=a.proposal_id JOIN p_shares s ON s.proposal_id=p.id WHERE s.token=? AND s.session_hash=? AND s.session_expires>? AND s.revision=p.revision AND a.revision=p.revision AND p.status=\'accepted\' AND NOT EXISTS(SELECT 1 FROM p_withdrawals w WHERE w.proposal_id=p.id AND w.revision=p.revision)').bind(c.token,c.share.session_hash,await currentTime(env.DB)).first<any>()
 need(row,'Sign this current proposal before paying',409)
 const policy=JSON.parse(row.snapshot).collectionPolicy
 need(policy?.enabled&&row.deposit_cents>0,'This agreement has no online deposit to collect',409)
 return {accepted:row,policy}
}

export async function clientCollection(env:Bindings,c:any,input:Record<string,unknown>,refresh=false){
 const {accepted,policy}=await boundClient(env,c);need(policy.provider!=='paypal','Use the PayPal collection door for this deposit',409)
 const db=env.DB,{secret}=await providerCredential(env,'workspace:stripe')
 let saved=await db.prepare('SELECT * FROM p_collection_intents WHERE proposal_id=? AND revision=?').bind(accepted.proposal_id,accepted.revision).first<any>()
 const method=String(input.method??saved?.method??'card')
 need(policy.methods.includes(method),'This payment method is not offered',400)
 if(saved)need(saved.account_id===secret.accountId&&saved.deposit_cents===accepted.deposit_cents&&saved.currency===accepted.currency&&saved.method===method,'The deposit or Stripe account changed. Contact the firm.',409)
 if(saved&&input.billingState!==undefined)need(String(input.billingState).trim().toUpperCase()===saved.billing_state,'Billing state is frozen for this deposit. Contact the firm to change it.',409)
 if(!saved){
  need(!refresh,'Start the deposit payment first',409)
  need(input.consent===true||input.consent==='yes','Confirm preparing this one-time deposit payment')
  need(secret.publishableKey,'The firm must reconnect Stripe with its publishable key',409)
  need(accepted.currency==='USD','Online deposit collection currently requires USD',409)
  const quote=await collectionQuote(db,accepted.deposit_cents,method,input.billingState)
  const id=crypto.randomUUID(),at=await currentTime(db),authorization=`I authorize a one-time ${method==='ach'?'ACH bank debit':'payment'} of ${(quote.cents/100).toFixed(2)} ${accepted.currency} for the deposit on “${JSON.parse(accepted.snapshot).title}”, revision ${accepted.revision}. No future charges are authorized.${method==='ach'?' Stripe verifies the bank account and records the ACH debit mandate.':' Stripe collects payment details securely.'}`
  try{await db.batch([
   db.prepare('INSERT INTO p_guard(ok) VALUES(EXISTS(SELECT 1 FROM p_shares WHERE token=? AND session_hash=? AND session_expires>?))').bind(c.token,c.share.session_hash,at),
   db.prepare("INSERT INTO p_collection_intents(id,proposal_id,revision,account_id,cents,deposit_cents,fee_cents,billing_state,currency,method,status,authorization,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,'reserved',?,?,?)").bind(id,accepted.proposal_id,accepted.revision,secret.accountId,quote.cents,quote.depositCents,quote.feeCents,quote.billingState,accepted.currency,method,authorization,at,at),db.prepare('DELETE FROM p_guard')
  ])}catch{fail('Payment preparation is already in progress. Refresh its status.',409)}
  const body=new URLSearchParams({amount:String(quote.cents),currency:accepted.currency.toLowerCase(),'automatic_payment_methods[enabled]':'true','automatic_payment_methods[allow_redirects]':'never','metadata[platter_proposal_id]':accepted.proposal_id,'metadata[platter_revision]':String(accepted.revision)})
  body.append('excluded_payment_method_types[]',method==='ach'?'card':'us_bank_account')
  // A reservation is retained after a timeout; no second intent is created automatically.
  const intent=await stripe(secret.token,'payment_intents',body,'platter-deposit-'+id)
  const expected=method==='ach'?'us_bank_account':'card'
  if(!Array.isArray(intent.payment_method_types)||!intent.payment_method_types.includes(expected)||intent.payment_method_types.some((m:string)=>m!==expected&&m!=='link')){
   await stripe(secret.token,'payment_intents/'+encodeURIComponent(intent.id)+'/cancel',new URLSearchParams())
   await db.prepare("UPDATE p_collection_intents SET status='unavailable',provider_intent=?,updated_at=? WHERE id=?").bind(intent.id,Date.now(),id).run()
   fail('Stripe does not offer this payment method for the connected account',409)
  }
  need(intent.amount===quote.cents&&intent.currency===accepted.currency.toLowerCase()&&typeof intent.id==='string','Stripe returned a different deposit',409)
  await db.prepare('UPDATE p_collection_intents SET provider_intent=?,status=?,updated_at=? WHERE id=?').bind(intent.id,intent.status,Date.now(),id).run()
  saved=await db.prepare('SELECT * FROM p_collection_intents WHERE id=?').bind(id).first<any>()
 }
 need(saved.provider_intent,'Payment preparation is held for reconciliation. Contact the firm.',409)
 const intent=await stripe(secret.token,'payment_intents/'+encodeURIComponent(saved.provider_intent)+'?expand[]=latest_charge')
 need(intent.id===saved.provider_intent&&intent.amount===saved.cents&&intent.currency===saved.currency.toLowerCase()&&intent.metadata?.platter_proposal_id===accepted.proposal_id&&intent.metadata?.platter_revision===String(accepted.revision),'Stripe deposit binding changed. Contact the firm.',409)
 await boundClient(env,c)
 const mandate=intent.latest_charge?.payment_method_details?.us_bank_account?.mandate
 if(intent.status==='succeeded'){
  const charge=intent.latest_charge
  need(charge&&charge.paid===true&&charge.status==='succeeded'&&charge.amount===saved.cents&&charge.currency===saved.currency.toLowerCase(),'Stripe has not confirmed the deposit charge',409)
  const owner=await db.prepare("SELECT id FROM oa_operators WHERE role='owner' AND status='active' LIMIT 1").first<{id:string}>();need(owner,'Payment reconciliation requires an active owner',409)
  await db.prepare("INSERT INTO p_payment_records(id,proposal_id,revision,currency,cents,method,provider_charge,reference,recorded_by,recorded_at) VALUES(?,?,?,?,?,'stripe',?,?,?,?) ON CONFLICT(provider_charge) DO NOTHING").bind(saved.id,accepted.proposal_id,accepted.revision,saved.currency,saved.cents,charge.id,saved.account_id,owner.id,Date.now()).run()
 }
 await db.prepare('UPDATE p_collection_intents SET status=?,provider_mandate=COALESCE(?,provider_mandate),updated_at=? WHERE id=? AND (status!=\'succeeded\' OR ?=\'succeeded\')').bind(intent.status,typeof mandate==='string'?mandate:null,Date.now(),saved.id,intent.status).run()
 const status=(await db.prepare('SELECT status FROM p_collection_intents WHERE id=?').bind(saved.id).first<{status:string}>())!.status
 if(status==='succeeded'){await queueReadyCompletionMail(env,accepted.proposal_id);await dispatchMail(env,accepted.proposal_id)}
 return {quote:{depositCents:saved.deposit_cents,feeCents:saved.fee_cents,cents:saved.cents},status,complete:policy.completion==='due'||status==='succeeded'&&Boolean(saved.authorized_at),...(refresh||status==='succeeded'?{}:{clientSecret:intent.client_secret,publishableKey:secret.publishableKey,methods:policy.methods,method:saved.method}),authorization:saved.authorization}
}


export async function authorizeCollection(env:Bindings,c:any,input:Record<string,unknown>){
 const {accepted,policy}=await boundClient(env,c);need(policy.provider!=='paypal','Use the PayPal collection door for this deposit',409)
 const db=env.DB
 const saved=await db.prepare('SELECT * FROM p_collection_intents WHERE proposal_id=? AND revision=?').bind(accepted.proposal_id,accepted.revision).first<any>()
 const {secret}=await providerCredential(env,'workspace:stripe')
 need(saved?.account_id===secret.accountId,'The Stripe account changed. Prepare the payment again with the firm.',409)
 need(saved?.provider_intent&&saved.deposit_cents===accepted.deposit_cents&&saved.currency===accepted.currency,'Prepare this deposit before authorizing it',409)
 need(input.consent===true&&Number(input.cents)===saved.cents,'Review and authorize the exact payment total',400)
 await db.batch([db.prepare('INSERT INTO p_guard(ok) VALUES(EXISTS(SELECT 1 FROM p_shares WHERE token=? AND session_hash=? AND session_expires>?))').bind(c.token,c.share.session_hash,await currentTime(db)),db.prepare('UPDATE p_collection_intents SET authorized_at=COALESCE(authorized_at,?) WHERE id=?').bind(await currentTime(db),saved.id),db.prepare('DELETE FROM p_guard')])
 await queueReadyCompletionMail(env,accepted.proposal_id);await dispatchMail(env,accepted.proposal_id)
 return {authorized:true}
}
