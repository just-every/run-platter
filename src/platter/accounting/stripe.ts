import type { Bindings } from '../../auth.server'
import { providerCredential } from '../connections'
import { commit, hash, need, text, type Actor } from '../model'
import { currentTime } from '../expiry-time'
import { allocateNet } from '../discounts'
import { canonical, configuration, configGuard, execution, reader } from './jobs'
import { providerId, quickbooks } from './quickbooks'

const integer=(n:any)=>Number.isSafeInteger(n)
const sourceKey=(account:string,kind:string,id:string)=>canonical([account,kind,id])
export async function stripeReader(env:Bindings,actor:Actor,authorize:()=>Promise<unknown>) {
 const current=await providerCredential(env,'workspace:stripe')
 const get=async(path:string)=>{
  await authorize()
  const {connection,secret}=await providerCredential(env,'workspace:stripe')
  need(connection.version===current.connection.version&&connection.account_id===current.connection.account_id,'Stripe connection changed. Review again.',409)
  const response=await fetch('https://api.stripe.com/v1'+path,{headers:{authorization:'Bearer '+secret.token,accept:'application/json'},redirect:'manual',signal:AbortSignal.timeout(30000)})
  need(response.ok,'Stripe did not confirm this accounting source',409)
  const raw=await response.text();need(raw.length<=262144,'Stripe returned an oversized accounting source',409)
  const value=JSON.parse(raw);need(value&&typeof value==='object'&&!value.error,'Stripe returned an invalid accounting source',409)
  return value
 }
 return {get,account:current.connection.account_id,version:current.connection.version}
}
export async function stripeReceipt(env:Bindings,actor:Actor,payment:any,authorize:()=>Promise<unknown>) {
 const source=await stripeReader(env,actor,authorize),charge=await source.get('/charges/'+encodeURIComponent(payment.provider_charge))
 need(source.account===payment.reference&&charge.id===payment.provider_charge&&charge.paid===true&&charge.status==='succeeded'&&charge.currency==='usd'&&charge.amount===payment.cents&&charge.metadata?.platter_proposal_id===payment.proposal_id&&String(charge.metadata?.platter_revision)===String(payment.revision)&&integer(charge.amount_refunded)&&charge.amount_refunded>=0&&charge.amount_refunded<=charge.amount,'Stripe did not confirm this exact accepted receipt',409)
 need(integer(charge.created)&&charge.created>0,'Stripe did not confirm the receipt date',409)
 return {source,charge,facts:{account:source.account,version:source.version,id:charge.id,amountCents:charge.amount,refundedCents:charge.amount_refunded,balanceTransaction:charge.balance_transaction,receivedOn:new Date(charge.created*1000).toISOString().slice(0,10)}}
}
async function accountMapping(authorize:any,id:unknown,types:string[]) {
 const key=providerId(id),account=(await quickbooks(authorize,'/account/'+encodeURIComponent(key))).Account
 need(account?.Id===key&&account.Active===true&&types.includes(account.AccountType),'Choose an active QuickBooks account of the required type',409)
 return {id:key,name:text(account.Name,'the account name'),type:account.AccountType}
}
function journal(day:string,amount:number,debit:string,credit:string,note:string) {
 need(integer(amount)&&amount>0,'This accounting adjustment needs a positive amount',409)
 return {TxnDate:day,PrivateNote:note,Line:[{Amount:amount/100,DetailType:'JournalEntryLineDetail',JournalEntryLineDetail:{PostingType:'Debit',AccountRef:{value:debit}}},{Amount:amount/100,DetailType:'JournalEntryLineDetail',JournalEntryLineDetail:{PostingType:'Credit',AccountRef:{value:credit}}}]}
}
async function adjustmentPlan(env:Bindings,actor:Actor,input:Record<string,unknown>) {
 const db=env.DB,kind=String(input.kind)
 need(['fee','refund','refund_fee','payout'].includes(kind),'Choose a charge fee, confirmed refund or paid payout',409)
 const payment=await db.prepare("SELECT * FROM p_payment_records WHERE id=? AND method='stripe'").bind(text(input.paymentId,'a linked Stripe receipt')).first<any>()
 need(payment,'Choose a linked Stripe receipt',409)
 const job=await db.prepare("SELECT * FROM p_accounting_jobs WHERE proposal_id=? AND status='complete'").bind(payment.proposal_id).first<any>()
 const posting=await db.prepare("SELECT * FROM p_accounting_postings WHERE payment_id=? AND status='confirmed'").bind(payment.id).first<any>()
 need(job&&posting,'Post the verified gross receipt before accounting for its fee, refund or payout',409)
 const config=await configuration(env),authorize=async()=>{await reader(env,actor,config)();return execution(env,job)}
 const {source,charge,facts}=await stripeReceipt(env,actor,payment,authorize),posted=JSON.parse(posting.plan)
 const clearing=await accountMapping(authorize,posted.depositAccountId,['Other Current Asset'])
 let body:any,bodyKind='journalentry',sourceId:string,sourceFacts:any,expense:any=null,bank:any=null,refundId:any=null,payoutId:any=null
 if(kind==='fee') {
  need(typeof charge.balance_transaction==='string','Stripe has not confirmed the charge balance transaction',409)
  const balance=await source.get('/balance_transactions/'+encodeURIComponent(charge.balance_transaction))
  need(balance.id===charge.balance_transaction&&balance.source===charge.id&&balance.type==='charge'&&balance.currency==='usd'&&balance.amount===payment.cents&&integer(balance.fee)&&balance.fee>0&&balance.net===balance.amount-balance.fee,'Stripe did not confirm this exact charge fee',409)
  expense=await accountMapping(authorize,input.expenseAccountId,['Expense','Other Expense'])
  sourceId=balance.id;sourceFacts={id:balance.id,source:balance.source,amount:balance.amount,fee:balance.fee,net:balance.net}
  body=journal(facts.receivedOn,balance.fee,expense.id,clearing.id,'Platter Stripe charge fee '+balance.id)
 } else if(kind==='refund'||kind==='refund_fee') {
  const saved=await db.prepare("SELECT * FROM p_refunds WHERE id=? AND payment_id=? AND status='succeeded' AND provider_refund IS NOT NULL").bind(text(input.refundId,'a confirmed refund'),payment.id).first<any>()
  need(saved,'Choose a processor-confirmed refund of this exact receipt',409)
  const refund=await source.get('/refunds/'+encodeURIComponent(saved.provider_refund))
  need(refund.id===saved.provider_refund&&refund.charge===charge.id&&refund.status==='succeeded'&&refund.currency==='usd'&&refund.amount===saved.cents&&integer(refund.created)&&typeof refund.balance_transaction==='string','Stripe did not confirm this exact refund',409)
  const balance=await source.get('/balance_transactions/'+encodeURIComponent(refund.balance_transaction))
  need(balance.id===refund.balance_transaction&&balance.source===refund.id&&balance.type==='refund'&&balance.currency==='usd'&&balance.amount===-saved.cents&&integer(balance.fee)&&balance.net===-saved.cents-balance.fee,'The refund has an unreviewed fee adjustment; reconcile it explicitly in QuickBooks',409)
  if(kind==='refund_fee'){
   need(balance.fee!==0,'This refund has no separate fee adjustment',409)
   need(await db.prepare("SELECT 1 FROM p_accounting_adjustments WHERE source_key=? AND status='confirmed'").bind(sourceKey(source.account,'refund',refund.id)).first(),'Record the confirmed gross refund before its fee adjustment',409)
   expense=await accountMapping(authorize,input.expenseAccountId,['Expense','Other Expense'])
   sourceId=balance.id;refundId=saved.id;sourceFacts={id:balance.id,source:refund.id,fee:balance.fee,net:balance.net}
   body=journal(new Date(refund.created*1000).toISOString().slice(0,10),Math.abs(balance.fee),balance.fee>0?expense.id:clearing.id,balance.fee>0?clearing.id:expense.id,'Platter Stripe refund fee '+balance.id)
  }else{
  const deposit=await db.prepare("SELECT body FROM p_accounting_requests WHERE proposal_id=? AND kind='invoice' AND status='confirmed'").bind(job.proposal_id).first<any>()
  need((posted.amountIndex??0)===0&&deposit,'This refund needs a confirmed deposit invoice',409)
  const original=JSON.parse(deposit.body),originalLines=original.Line.filter((l:any)=>l.DetailType==='SalesItemLineDetail'),taxLines=original.TxnTaxDetail?.TaxLine??[]
  const taxParts=taxLines.map((l:any)=>allocateNet([saved.cents,payment.cents-saved.cents],Math.round(l.Amount*100))[0]),taxCents=taxParts.reduce((n:number,v:number)=>n+v,0)
  const nets=allocateNet(originalLines.map((l:any)=>Math.round(l.Amount*100)),saved.cents-taxCents),taxable=nets.reduce((n:number,v:number,i:number)=>n+(originalLines[i].SalesItemLineDetail.TaxCodeRef?.value==='TAX'?v:0),0)
  bodyKind='refundreceipt';sourceId=refund.id;refundId=saved.id;sourceFacts={id:refund.id,balanceTransaction:balance.id,cents:saved.cents,created:refund.created}
  body={CustomerRef:original.CustomerRef,DepositToAccountRef:{value:clearing.id},TxnDate:new Date(refund.created*1000).toISOString().slice(0,10),CurrencyRef:{value:'USD'},GlobalTaxCalculation:original.GlobalTaxCalculation,PrivateNote:'Platter Stripe refund '+refund.id,Line:originalLines.map((l:any,i:number)=>({...l,Amount:nets[i]/100,Description:'Refund: '+l.Description,SalesItemLineDetail:{...l.SalesItemLineDetail,Qty:1,UnitPrice:nets[i]/100}})),...(original.TxnTaxDetail?{TxnTaxDetail:{...original.TxnTaxDetail,TotalTax:taxCents/100,TaxLine:taxLines.map((l:any,i:number)=>({...l,Amount:taxParts[i]/100,TaxLineDetail:{...l.TaxLineDetail,NetAmountTaxable:taxable/100}}))}}:{})}
  }
 } else {
  payoutId=providerId(input.payoutId)
  const payout=await source.get('/payouts/'+encodeURIComponent(payoutId)),balances=await source.get('/balance_transactions?payout='+encodeURIComponent(payoutId)+'&limit=100')
  need(payout.id===payoutId&&payout.status==='paid'&&payout.currency==='usd'&&integer(payout.amount)&&payout.amount>0&&integer(payout.arrival_date),'Stripe has not confirmed a paid USD payout',409)
  need(balances.has_more===false&&Array.isArray(balances.data)&&balances.data.length>0&&balances.data.length<=100,'Review a complete payout of at most one hundred balance transactions',409)
  const entries=[]
  for(const balance of balances.data) {
   need(['charge','refund'].includes(balance.type)&&balance.currency==='usd'&&integer(balance.amount)&&integer(balance.fee)&&balance.net===balance.amount-balance.fee,'This payout contains an unsupported accounting entry',409)
   const receipt=await db.prepare("SELECT p.*,a.plan AS posting_plan FROM p_payment_records p JOIN p_accounting_postings a ON a.payment_id=p.id AND a.status='confirmed' WHERE p.provider_charge=? AND p.reference=?").bind(balance.type==='charge'?balance.source:'',source.account).first<any>()
   if(balance.type==='charge') {
    need(receipt&&receipt.cents===balance.amount&&JSON.parse(receipt.posting_plan).depositAccountId===clearing.id,'Every payout charge must already have a confirmed gross posting to this clearing account',409)
    if(balance.fee)need(await db.prepare("SELECT 1 FROM p_accounting_adjustments WHERE source_key=? AND status='confirmed' AND json_extract(plan,'$.clearing.id')=? AND json_extract(plan,'$.sourceFacts.fee')=?").bind(sourceKey(source.account,'fee',balance.id),clearing.id,balance.fee).first(),'Post every payout fee before clearing the payout',409)
   } else { need(await db.prepare("SELECT 1 FROM p_accounting_adjustments WHERE source_key=? AND status='confirmed' AND json_extract(plan,'$.clearing.id')=? AND json_extract(plan,'$.sourceFacts.cents')=?").bind(sourceKey(source.account,'refund',balance.source),clearing.id,-balance.amount).first(),'Every payout refund must already have a confirmed accounting reflection',409)
    if(balance.fee)need(await db.prepare("SELECT 1 FROM p_accounting_adjustments WHERE source_key=? AND status='confirmed' AND json_extract(plan,'$.clearing.id')=? AND json_extract(plan,'$.sourceFacts.fee')=?").bind(sourceKey(source.account,'refund_fee',balance.id),clearing.id,balance.fee).first(),'Post the confirmed refund fee adjustment before clearing this payout',409)
   }
   entries.push({id:providerId(balance.id),source:providerId(balance.source),type:balance.type,amount:balance.amount,fee:balance.fee,net:balance.net})
  }
  need(new Set(entries.map(e=>e.id)).size===entries.length&&entries.reduce((n,e)=>n+e.net,0)===payout.amount,'The complete payout entries must equal its exact net bank deposit',409)
  bank=await accountMapping(authorize,input.bankAccountId,['Bank']);sourceId=payoutId;sourceFacts={id:payoutId,amount:payout.amount,arrivalDate:payout.arrival_date,entries:entries.sort((a,b)=>a.id.localeCompare(b.id))}
  body=journal(new Date(payout.arrival_date*1000).toISOString().slice(0,10),payout.amount,bank.id,clearing.id,'Platter Stripe payout '+payoutId)
 }
 const person=await db.prepare('SELECT version FROM oa_operators WHERE id=?').bind(actor.id).first<any>()
 const plan={sourceKey:sourceKey(source.account,kind,sourceId),kind,paymentId:payment.id,proposalId:payment.proposal_id,refundId,payoutId,clearing,expense,bank,stripe:facts,sourceFacts,bodyKind,body,settingsVersion:config.version,connectionVersion:config.connection_version,actorId:actor.id,actorRole:actor.role,operatorVersion:person.version,memberVersion:actor.memberVersion??0}
 return {plan,config,authorize:async()=>{const current=await providerCredential(env,'workspace:stripe');need(current.connection.version===facts.version&&current.connection.account_id===facts.account,'Stripe connection changed before the accounting write',409);return authorize()}}
}
export async function adjustmentCommand(env:Bindings,actor:Actor,name:string,input:Record<string,unknown>) {
 const db=env.DB,at=await currentTime(db)
 if(name==='accounting.adjustment.review') {
  const {plan,config}=await adjustmentPlan(env,actor,input),encoded=canonical(plan),digest=await hash(encoded),id=crypto.randomUUID()
  await commit(db,actor,[db.prepare('INSERT INTO p_accounting_reviews VALUES(?,?,?,?,?,?,NULL)').bind(id,plan.proposalId,actor.id,digest,encoded,at+600000)],false,configGuard(config))
  return {accountingAdjustmentReview:true,id,digest,plan}
 }
 const review=await db.prepare('SELECT * FROM p_accounting_reviews WHERE id=? AND actor_id=?').bind(text(input.id,'a reviewed accounting adjustment'),actor.id).first<any>()
 need(review&&review.digest===input.digest,'Review this exact accounting source first',409)
 const recorded=JSON.parse(review.plan);need(recorded.sourceKey,'Choose an adjustment review',409)
 const previous=await db.prepare('SELECT status FROM p_accounting_adjustments WHERE source_key=?').bind(recorded.sourceKey).first<any>()
 if(previous)return {accountingResult:true,status:previous.status,message:'This processor source already has one retained accounting reflection. Uncertain outcomes are never replayed.'}
 need(!review.consumed_at&&review.expires_at>at&&(input.consent===true||input.consent==='yes'),'The adjustment review expired or consent is missing',409)
 const state=await adjustmentPlan(env,actor,{kind:recorded.kind,paymentId:recorded.paymentId,refundId:recorded.refundId,payoutId:recorded.payoutId,expenseAccountId:recorded.expense?.id,bankAccountId:recorded.bank?.id})
 need(canonical(state.plan)===review.plan,'The processor source, accounts or authority changed. Review again.',409)
 const requestId=crypto.randomUUID(),guard=configGuard(state.config)
 guard.sql+=' AND EXISTS(SELECT 1 FROM p_accounting_reviews WHERE id=? AND consumed_at IS NULL AND expires_at>?)'
 guard.values.push(review.id,at)
 await commit(db,actor,[db.prepare('UPDATE p_accounting_reviews SET consumed_at=? WHERE id=?').bind(at,review.id),db.prepare("INSERT INTO p_accounting_adjustments VALUES(?,?,?,?,?,'writing',NULL,?)").bind(recorded.sourceKey,recorded.proposalId,recorded.kind,requestId,review.plan,at)],false,guard)
 let status='uncertain',id:string|null=null
 try {
  const response=await quickbooks(state.authorize,'/'+recorded.bodyKind,recorded.body,requestId),value=response[recorded.bodyKind==='journalentry'?'JournalEntry':'RefundReceipt']
  need(value,'QuickBooks did not confirm the accounting reflection',409)
  const project=(v:any)=>v.Line?.map((l:any)=>({amount:l.Amount,detail:l.DetailType,account:l.JournalEntryLineDetail?.AccountRef?.value,posting:l.JournalEntryLineDetail?.PostingType,item:l.SalesItemLineDetail?.ItemRef?.value,tax:l.SalesItemLineDetail?.TaxCodeRef?.value}))
  need(canonical(project(value))===canonical(project(recorded.body))&&value.TxnDate===recorded.body.TxnDate,'QuickBooks returned a different accounting reflection',409)
  if(recorded.bodyKind==='refundreceipt')need(value.CustomerRef?.value===recorded.body.CustomerRef.value&&value.DepositToAccountRef?.value===recorded.clearing.id&&canonical(value.TxnTaxDetail??null)===canonical(recorded.body.TxnTaxDetail??null)&&Math.round(value.TotalAmt*100)===recorded.sourceFacts.cents,'QuickBooks returned a different refund',409)
  id=providerId(value.Id);status='confirmed'
 } catch { /* Retain the unique source claim across a lost acknowledgement. */ }
 await db.prepare('UPDATE p_accounting_adjustments SET status=?,provider_id=? WHERE source_key=?').bind(status,id,recorded.sourceKey).run()
 return {accountingResult:true,status,message:status==='confirmed'?'QuickBooks confirmed the reviewed processor accounting reflection.':'Accounting reflection held. Reconcile in QuickBooks; this source will never be blindly replayed.'}
}
