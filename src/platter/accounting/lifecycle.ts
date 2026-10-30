import type { Bindings } from '../../auth.server'
import { commit, hash, need, text, type Actor } from '../model'
import { currentTime } from '../expiry-time'
import { providerCredential } from '../connections'
import { stripeReceipt } from './stripe'
import { canonical, configuration, configGuard, execution, reader } from './jobs'
import { providerId, quickbooks, type QuickBooksAuthority } from './quickbooks'

function cents(value: unknown) {
 need(typeof value === 'number' && Number.isFinite(value) && value >= 0 && Number.isSafeInteger(Math.round(value * 100)) && Math.abs(value * 100 - Math.round(value * 100)) < 0.00001, 'QuickBooks returned an invalid amount', 409)
 return Math.round(value * 100)
}
async function invoiceFor(env: Bindings, actor: Actor, id: string, amountIndex = 0) {
 const job = await env.DB.prepare("SELECT * FROM p_accounting_jobs WHERE proposal_id=? AND status='complete' AND provider_id IS NOT NULL").bind(id).first<any>()
 need(job, 'Choose a confirmed QuickBooks deposit invoice', 409)
 const config = await configuration(env)
 const authorize: QuickBooksAuthority = async () => { await reader(env,actor,config)(); return execution(env,job) }
 const amount = amountIndex===0?null:await env.DB.prepare("SELECT * FROM p_accounting_amounts WHERE proposal_id=? AND amount_index=? AND status='complete'").bind(id,amountIndex).first<any>()
 need(amountIndex===0||amount,'Choose a confirmed scheduled invoice',409)
 const invoiceId=amount?.provider_id??job.provider_id
 const invoice = (await quickbooks(authorize, '/invoice/' + encodeURIComponent(providerId(invoiceId)))).Invoice
 const plan = JSON.parse(job.plan), customer = await env.DB.prepare("SELECT provider_id FROM p_accounting_customers WHERE account_id=? AND client_id=? AND status='complete'").bind(job.account_id,job.client_id).first<any>()
 need(invoice?.Id === invoiceId && invoice.CustomerRef?.value === customer?.provider_id && invoice.CurrencyRef?.value === 'USD', 'QuickBooks invoice identity or currency changed', 409)
 const retainedBody=amount?.request_body??(await env.DB.prepare("SELECT body FROM p_accounting_requests WHERE proposal_id=? AND kind='invoice' AND status='confirmed'").bind(id).first<any>())?.body
 need(retainedBody,'The retained invoice request is unavailable',409)
 const retained=JSON.parse(retainedBody),projection=(v:any)=>({lines:v.Line?.filter((l:any)=>l.DetailType==='SalesItemLineDetail').map((l:any)=>({amount:l.Amount,item:l.SalesItemLineDetail?.ItemRef?.value,tax:l.SalesItemLineDetail?.TaxCodeRef?.value})),tax:v.TxnTaxDetail?.TotalTax??0,taxGroup:v.TxnTaxDetail?.TxnTaxCodeRef?.value??null,date:v.TxnDate,due:v.DueDate})
 const matches=canonical(projection(invoice))===canonical(projection(retained))
 const total = cents(invoice.TotalAmt), balance = cents(invoice.Balance)
 need(balance <= total, 'QuickBooks returned an invalid balance', 409)
 return { job, config, authorize, invoice, total, balance, expected: amount?.amount_cents??plan.depositCents, invoiceId, amountIndex, matches, customerId: customer.provider_id }
}
async function paymentPlan(env: Bindings, actor: Actor, input: Record<string,unknown>) {
 const payment = await env.DB.prepare('SELECT * FROM p_payment_records WHERE id=?').bind(text(input.paymentId,'a recorded payment')).first<any>()
 need(payment && ['check','wire','ach_credit','stripe'].includes(payment.method), 'Choose a recorded payment', 409)
 const target=String(input.invoiceTarget??''),index=target?Number(target.slice(target.lastIndexOf(':')+1)):Number(input.amountIndex??0)
 need(!target||target===payment.proposal_id+':'+index,'Choose an invoice belonging to this recorded receipt agreement',409)
 const state = await invoiceFor(env,actor,payment.proposal_id,index)
 need(state.matches && state.total === state.expected && state.balance >= payment.cents && payment.cents > 0 && payment.currency === 'USD' && payment.revision === state.job.revision, 'The recorded receipt must fit this unchanged QuickBooks invoice balance and revision', 409)
 const stripe=payment.method==='stripe'?await stripeReceipt(env,actor,payment,state.authorize):null
 const accountId = providerId(input.depositAccountId), account = (await quickbooks(state.authorize,'/account/' + encodeURIComponent(accountId))).Account
 need(account?.Id === accountId && account.Active === true && (stripe?['Other Current Asset']:['Bank','Other Current Asset']).includes(account.AccountType), 'Choose an active bank or undeposited-funds account',409)
 const person = await env.DB.prepare('SELECT version FROM oa_operators WHERE id=?').bind(actor.id).first<any>()
 const plan = { paymentId:payment.id, proposalId:payment.proposal_id, paymentVersion:payment.version, cents:payment.cents, method:payment.method, reference:payment.reference, receivedOn:stripe?.facts.receivedOn??payment.received_on, ...(stripe?{stripe:stripe.facts}:{}), invoiceId:state.invoiceId, amountIndex:state.amountIndex, customerId:state.customerId, totalCents:state.total, balanceCents:state.balance, depositAccountId:accountId, depositAccountName:account.Name, settingsVersion:state.config.version, connectionVersion:state.config.connection_version, actorId:actor.id, actorRole:actor.role, operatorVersion:person.version, memberVersion:actor.memberVersion??0 }
 return { ...state, plan, authorize:async()=>{if(stripe){const current=await providerCredential(env,'workspace:stripe');need(current.connection.version===stripe.facts.version&&current.connection.account_id===stripe.facts.account,'Stripe connection changed before posting',409)}return state.authorize()} }
}
export async function lifecycleCommand(env: Bindings, actor: Actor, name: string, input: Record<string,unknown>) {
 const db=env.DB, at=await currentTime(db)
 if(name === 'accounting.readback') {
  const state=await invoiceFor(env,actor,text(input.proposalId,'a confirmed accounting agreement'),Number(input.amountIndex??0))
  const status=!state.matches||state.total!==state.expected?'mismatch':state.balance===0?'paid':state.balance===state.total?'unpaid':'partially_paid'
  const observation=state.amountIndex===0?db.prepare(`INSERT INTO p_accounting_observations VALUES(?,?,?,?,?,?,?) ON CONFLICT(proposal_id) DO UPDATE SET provider_id=excluded.provider_id,total_cents=excluded.total_cents,balance_cents=excluded.balance_cents,observed_at=excluded.observed_at,status=excluded.status,detail=excluded.detail`).bind(state.job.proposal_id,state.invoiceId,state.total,state.balance,at,status,'QuickBooks confirmed invoice total and open balance'):db.prepare(`INSERT INTO p_accounting_amount_observations VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(proposal_id,amount_index) DO UPDATE SET provider_id=excluded.provider_id,total_cents=excluded.total_cents,balance_cents=excluded.balance_cents,observed_at=excluded.observed_at,status=excluded.status,detail=excluded.detail`).bind(state.job.proposal_id,state.amountIndex,state.invoiceId,state.total,state.balance,at,status,'QuickBooks confirmed scheduled invoice total and open balance')
  await commit(db,actor,[observation],false,configGuard(state.config))
  return { accountingResult:true,status,message:status==='mismatch'?'QuickBooks invoice differs from the retained accepted amount, lines, tax or dates. Reconcile before posting payments.':'QuickBooks invoice is '+status.replaceAll('_',' ')+'.' }
 }
 if(name === 'accounting.payment.review') {
  const {plan,config}=await paymentPlan(env,actor,input), encoded=canonical(plan), digest=await hash(encoded), id=crypto.randomUUID()
  await commit(db,actor,[db.prepare('INSERT INTO p_accounting_reviews VALUES(?,?,?,?,?,?,NULL)').bind(id,plan.proposalId,actor.id,digest,encoded,at+600000)],false,configGuard(config))
  return { accountingPaymentReview:true,id,digest,plan }
 }
 need(name==='accounting.payment.apply','Unknown accounting action',404)
 const review=await db.prepare('SELECT * FROM p_accounting_reviews WHERE id=? AND actor_id=?').bind(text(input.id,'a reviewed payment'),actor.id).first<any>()
 need(review && review.digest===input.digest,'Review this exact recorded payment first',409)
 const recorded=JSON.parse(review.plan)
 need(recorded.paymentId,'Choose a payment review',409)
 const previous=await db.prepare('SELECT status FROM p_accounting_postings WHERE payment_id=?').bind(recorded.paymentId).first<any>()
 if(previous)return {accountingResult:true,status:previous.status,message:'This receipt already has one retained posting. Uncertain writes require reconciliation in QuickBooks.'}
 need(!review.consumed_at && review.expires_at>at && (input.consent===true||input.consent==='yes'),'The payment review expired or consent is missing',409)
 const state=await paymentPlan(env,actor,{paymentId:recorded.paymentId,depositAccountId:recorded.depositAccountId,amountIndex:recorded.amountIndex??0})
 need(canonical(state.plan)===review.plan,'The receipt, invoice balance, account or authority changed. Review again.',409)
 const requestId=crypto.randomUUID(), guard=configGuard(state.config)
 guard.sql+=` AND EXISTS(SELECT 1 FROM p_accounting_reviews WHERE id=? AND consumed_at IS NULL AND expires_at>?) AND EXISTS(SELECT 1 FROM p_payment_records WHERE id=? AND version=?) AND ? <= ? - COALESCE((SELECT SUM(p.cents) FROM p_accounting_postings x JOIN p_payment_records p ON p.id=x.payment_id WHERE x.proposal_id=? AND COALESCE(json_extract(x.plan,'$.amountIndex'),0)=?),0)`
 guard.values.push(review.id,at,recorded.paymentId,recorded.paymentVersion,recorded.cents,state.expected,recorded.proposalId,recorded.amountIndex??0)
 await commit(db,actor,[db.prepare('UPDATE p_accounting_reviews SET consumed_at=? WHERE id=?').bind(at,review.id),db.prepare("INSERT INTO p_accounting_postings VALUES(?,?,?,?,'writing',NULL,?)").bind(recorded.paymentId,recorded.proposalId,requestId,review.plan,at)],false,guard)
 let status='uncertain',id:string|null=null
 try {
  // Recheck the current member and connection immediately before the provider write.
  const authorize: QuickBooksAuthority = async()=>{ await commit(db,actor,[],false,configGuard(state.config)); return state.authorize() }
  const body={CustomerRef:{value:recorded.customerId},TotalAmt:recorded.cents/100,TxnDate:recorded.receivedOn,PaymentRefNum:recorded.reference.slice(0,21),PrivateNote:'Platter receipt '+recorded.paymentId,DepositToAccountRef:{value:recorded.depositAccountId},Line:[{Amount:recorded.cents/100,LinkedTxn:[{TxnId:recorded.invoiceId,TxnType:'Invoice'}]}]}
  const payment=(await quickbooks(authorize,'/payment',body,requestId)).Payment
  need(payment && payment.CustomerRef?.value===recorded.customerId && payment.DepositToAccountRef?.value===recorded.depositAccountId && payment.TxnDate===recorded.receivedOn && cents(payment.TotalAmt)===recorded.cents && canonical(payment.Line)===canonical(body.Line),'QuickBooks did not confirm this exact applied receipt',409)
  id=providerId(payment.Id);status='confirmed'
 } catch { /* The durable claim remains even if the provider persisted the payment. */ }
 await db.prepare('UPDATE p_accounting_postings SET status=?,provider_id=? WHERE payment_id=?').bind(status,id,recorded.paymentId).run()
 return {accountingResult:true,status,message:status==='confirmed'?'QuickBooks confirmed this receipt against the deposit invoice.':'Payment posting held. Reconcile in QuickBooks; this receipt will never be blindly replayed.'}
}
