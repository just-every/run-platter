import type { Bindings } from '../../auth.server'
import { providerCredential, providerJson } from '../connections'
import { commit, need, text, type Actor } from '../model'
import { accountingSettings, accountingWrite, syncAccounting } from './quickbooks'
import { financeRoles } from './amounts'
import { localDate } from '../expiry-time'
import { installationZone } from '../reports/report-state'
const integer=(n:any)=>Number.isSafeInteger(n)
export async function clearingCommand(env:Bindings,a:Actor,p:Record<string,unknown>){
 need(financeRoles.includes(a.role),'Only owner, admins and billing reconcile payouts',403)
 need(p.consent===true||p.consent==='yes','Confirm posting the verified payout and processing fees')
 const payoutId=text(p.payoutId,'a Stripe payout id',200),{secret}=await providerCredential(env,'workspace:stripe'),settings=await accountingSettings(env)
 need(settings?.enabled&&settings.authority==='quickbooks','Authorize QuickBooks accounting before reconciling payouts',409)
 const payout=await providerJson('https://api.stripe.com/v1/payouts/'+encodeURIComponent(payoutId),secret.token)
 need(payout.id===payoutId&&payout.status==='paid'&&payout.currency==='usd'&&integer(payout.amount)&&payout.amount>0&&integer(payout.arrival_date)&&payout.arrival_date>0,'Stripe must confirm a paid USD payout',409)
 const list=await providerJson('https://api.stripe.com/v1/balance_transactions?payout='+encodeURIComponent(payoutId)+'&limit=100',secret.token)
 need(Array.isArray(list.data)&&list.data.length>0&&list.has_more===false,'The entire payout transaction list must be available; no partial posting',409)
 const ids=new Set<string>(),transactions:any[]=list.data
 for(const tx of transactions){
  need(typeof tx.id==='string'&&!ids.has(tx.id)&&tx.currency==='usd'&&integer(tx.amount)&&integer(tx.fee)&&integer(tx.net)&&tx.amount-tx.fee===tx.net&&integer(tx.created)&&tx.created>0,'Stripe payout transaction is invalid',409);ids.add(tx.id)
  need(['charge','payment','refund'].includes(tx.type),'This payout contains an unsupported adjustment or dispute; reconcile it manually',409)
  if(['charge','payment'].includes(tx.type)){
   const bound=await env.DB.prepare("SELECT 1 FROM p_provider_payments p WHERE p.charge_id=? AND p.account_id=? AND p.cents=? UNION ALL SELECT 1 FROM p_payment_records p WHERE p.method='stripe' AND p.provider_charge=? AND p.reference=? AND p.cents=? AND p.currency='USD'").bind(tx.source,secret.accountId,tx.amount,tx.source,secret.accountId,tx.amount).first<any>()
   need(bound,'Every payout charge must be verified against an accepted scheduled amount',409)
  }else{
   const refund=await env.DB.prepare("SELECT r.*,p.reference FROM p_refunds r JOIN p_payment_records p ON p.id=r.payment_id WHERE r.provider_refund=? AND r.status='succeeded'").bind(tx.source).first<any>()
   need(refund&&refund.reference===secret.accountId&&refund.cents===-tx.amount,'Every payout refund must match a confirmed retained refund',409)
  }
 }
 need(transactions.reduce((n,tx)=>n+tx.net,0)===payout.amount,'Stripe payout net does not match its complete transactions',409)
 // Validate the whole batch before any accounting mutation.
 await commit(env.DB,a,[])
 await syncAccounting(env)
 const zone=await installationZone(env.DB),payoutDate=localDate(payout.arrival_date*1000,zone)
 const journal=(amount:number,debit:string,credit:string,label:string,date:string)=>({TxnDate:date,CurrencyRef:{value:'USD'},Line:[{Amount:amount/100,Description:label,DetailType:'JournalEntryLineDetail',JournalEntryLineDetail:{PostingType:'Debit',AccountRef:{value:debit}}},{Amount:amount/100,Description:label,DetailType:'JournalEntryLineDetail',JournalEntryLineDetail:{PostingType:'Credit',AccountRef:{value:credit}}}]})
 for(const tx of transactions){
  await commit(env.DB,a,[])
  if(tx.type==='refund'){
   const posted=await env.DB.prepare("SELECT * FROM p_clearing_postings WHERE authority=? AND account_id=? AND source_id=? AND kind='refund'").bind(settings.authority,settings.account_id,tx.source).first<any>()
   need(posted&&posted.clearing_delta===tx.amount,'Confirm the linked invoice refund credit before reconciling its payout',409)
  }else{
   const gross=await env.DB.prepare("SELECT 1 FROM p_clearing_postings WHERE source_id=? AND kind='gross' AND account_id=? AND authority=?").bind(tx.source,settings.account_id,settings.authority).first()
   need(gross,'Post every gross payment successfully before its payout',409)
  }
  if(tx.fee){
   const receipt=await accountingWrite(env,'fee',tx.id,journal(Math.abs(tx.fee),tx.fee>0?settings.fee_account:settings.clearing_account,tx.fee>0?settings.clearing_account:settings.fee_account,'Stripe processing fee '+tx.id,localDate(tx.created*1000,zone)),'JournalEntry')
   need(receipt.status==='succeeded','Fee posting held for provider reconciliation',409)
   await posting(env,receipt,tx.id,'fee',tx.fee,-tx.fee,tx.fee,0)
  }
 }
 await commit(env.DB,a,[])
 const receipt=await accountingWrite(env,'payout',payoutId,{TxnDate:payoutDate,Amount:payout.amount/100,FromAccountRef:{value:settings.clearing_account},ToAccountRef:{value:settings.bank_account},PrivateNote:'Stripe payout '+payoutId},'Transfer')
 need(receipt.status==='succeeded','Payout transfer held for provider reconciliation',409)
 await posting(env,receipt,payoutId,'payout',payout.amount,-payout.amount,0,payout.amount)
 return{id:payoutId,posted:true}
}
async function posting(env:Bindings,receipt:any,source:string,kind:string,n:number,clearing:number,fee:number,bank:number){
 await env.DB.prepare('INSERT OR IGNORE INTO p_clearing_postings(id,authority,account_id,source_id,kind,cents,clearing_delta,fee_delta,bank_delta,external_id) VALUES(?,?,?,?,?,?,?,?,?,?)').bind(receipt.id,receipt.authority,receipt.account_id,source,kind,n,clearing,fee,bank,receipt.external_id).run()
}
