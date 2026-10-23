import { remittanceInstructions } from '../payments/remittance'
import { invoiceLines, mapCatalog } from './catalog'
import type { Bindings } from '../../auth.server'
import { providerCredential, providerJson } from '../connections'
import { commit, need, text, hash, type Actor } from '../model'
import { currentTime, localDate } from '../expiry-time'
import { installationZone } from '../reports/report-state'
import { ensureAmounts, amountRows, financeRoles, markMilestone } from './amounts'
const base=(account:string)=>'https://quickbooks.api.intuit.com/v3/company/'+encodeURIComponent(account)+'/'
const cents=(value:any)=>{const n=Math.round(Number(value)*100);need(Number.isSafeInteger(n)&&n>=0,'Accounting returned an invalid amount',409);return n}
export async function accountingSettings(env:Bindings){return env.DB.prepare('SELECT * FROM p_accounting_settings WHERE singleton=1').first<any>()}
async function live(env:Bindings){
 const settings=await accountingSettings(env);need(settings?.enabled,'Explicitly authorize accounting synchronization first',409)
 const authorization=await env.DB.prepare('SELECT 1 FROM p_accounting_authority WHERE singleton=1 AND settings_version=? AND authorized_by=?').bind(settings.version,settings.authorized_by).first();need(authorization,'Authorize accounting sync again after restoration or a settings change',409)
 const person=await env.DB.prepare("SELECT 1 FROM oa_operators o LEFT JOIN p_members m ON m.operator_id=o.id WHERE o.id=? AND o.status='active' AND (o.role IN ('owner','admin') OR m.role='admin')").bind(settings.authorized_by).first()
 need(person,'Accounting authorization needs an active owner or admin',403)
 const credential=await providerCredential(env,'workspace:'+settings.authority)
 need(credential.secret.accountId===settings.account_id,'Reconnect the original accounting company; authority cannot change after invoices exist',409)
 need(settings.authority==='quickbooks','This authority is not implemented yet',409)
 return {settings,token:credential.secret.token,account:credential.secret.accountId}
}
export async function accountingWrite(env:Bindings,kind:string,subject:string,payload:any,entity:string){
 const {settings,token,account}=await live(env),db=env.DB,id='platter-'+(await hash(settings.authority+'|'+account+'|'+kind+'|'+subject)).slice(0,40),body=JSON.stringify(payload)
 const old=await db.prepare('SELECT * FROM p_accounting_requests WHERE id=?').bind(id).first<any>()
 if(old){need(old.payload===body,'Accounting request content changed; reconcile before continuing',409);return old}
 const claimed=await db.prepare("INSERT OR IGNORE INTO p_accounting_requests(id,authority,account_id,kind,subject,payload,status,created_at) VALUES(?,?,?,?,?,?,'claimed',?)").bind(id,settings.authority,account,kind,subject,body,await currentTime(db)).run()
 if(!claimed.meta.changes)return db.prepare('SELECT * FROM p_accounting_requests WHERE id=?').bind(id).first<any>()
 // Claim before I/O. A timeout is a durable hold, never an automatic duplicate POST.
 let external:string|null=null
 try{
  await live(env)
  const response=await fetch(base(account)+entity.toLowerCase()+'?requestid='+encodeURIComponent(id),{method:'POST',redirect:'manual',headers:{authorization:'Bearer '+token,'content-type':'application/json',accept:'application/json'},body})
  if([401,403].includes(response.status))await db.prepare("UPDATE p_connections SET broken_at=? WHERE id='workspace:quickbooks' AND account_id=? AND status='connected'").bind(Date.now(),account).run()
  if(response.ok){const raw=await response.text();if(raw.length<=262144){const value=JSON.parse(raw);if(typeof value[entity]?.Id==='string')external=value[entity].Id}}
 }catch{/* Provider receipt is uncertain. Keep it for reconciliation. */}
 await db.prepare("UPDATE p_accounting_requests SET status=?,external_id=? WHERE id=? AND status='claimed'").bind(external?'succeeded':'held',external,id).run()
 return db.prepare('SELECT * FROM p_accounting_requests WHERE id=?').bind(id).first<any>()
}
async function customer(env:Bindings,client:any){
 const {settings,account,token}=await live(env),db=env.DB
 const existing=await db.prepare('SELECT external_id FROM p_accounting_customers WHERE client_id=? AND authority=? AND account_id=?').bind(client.id,settings.authority,account).first<any>()
 if(existing)return existing.external_id
 // The installation's immutable client id is the match key. Names/email alone never merge customers.
 const display='Platter '+(await hash(client.id)).slice(0,40),query="SELECT * FROM Customer WHERE DisplayName = '"+display+"'"
 const found=await providerJson(base(account)+'query?query='+encodeURIComponent(query),token),matches=found.QueryResponse?.Customer??[]
 need(matches.length<=1,'Accounting has ambiguous customer bindings',409)
 let external=matches[0]?.Id
 if(external)need(matches[0].PrimaryEmailAddr?.Address?.toLowerCase()===client.email.toLowerCase(),'Accounting customer identity differs; review before syncing',409)
 if(!external){const result=await accountingWrite(env,'customer',client.id,{DisplayName:display,CompanyName:client.name,PrimaryEmailAddr:{Address:client.email}},'Customer');need(result.status==='succeeded','Customer creation held for provider reconciliation',409);external=result.external_id}
 await db.prepare('INSERT OR IGNORE INTO p_accounting_customers(client_id,authority,account_id,external_id) VALUES(?,?,?,?)').bind(client.id,settings.authority,account,external).run()
 return external
}
export async function syncAccounting(env:Bindings,id?:string){
 const db=env.DB
 await ensureAmounts(env,id)
 const settings=await accountingSettings(env);if(!settings?.enabled)return
 let account:string,token:string;try{({account,token}=await live(env))}catch{await db.prepare("UPDATE p_amounts SET accounting_status='held',mismatch='Reconnect and explicitly authorize the original accounting company' WHERE external_id IS NOT NULL").run();return}
 const today=localDate(await currentTime(db),await installationZone(db))
 const amounts=(await amountRows(env,id)).filter(r=>r.issue_on&&r.issue_on<=today)
 for(const amount of amounts){
  try{
   need(amount.paidCents<=amount.cents,'Payments exceed this invoice; review the mismatch before posting',409)
   const client=await db.prepare('SELECT c.* FROM p_clients c JOIN p_proposals p ON p.client_id=c.id WHERE p.id=?').bind(amount.proposal_id).first<any>(),customerId=await customer(env,client)
   let external=amount.external_id
   if(external)need(amount.external_account===account,'Invoice belongs to another accounting account',409)
   if(!external){
    const accepted=await db.prepare('SELECT * FROM p_acceptances WHERE proposal_id=?').bind(amount.proposal_id).first<any>(),lines=await invoiceLines(env,accepted,amount,settings,token,account)
    const payload={DocNumber:'PL-'+(await hash(amount.id)).slice(0,18),CustomerRef:{value:customerId},TxnDate:amount.issue_on,DueDate:amount.due_on,CurrencyRef:{value:amount.currency},PrivateNote:'Platter scheduled amount '+amount.id,CustomerMemo:{value:await remittanceInstructions(db)},Line:lines}
    const receipt=await accountingWrite(env,'invoice',amount.id,payload,'Invoice')
    need(receipt.status==='succeeded','Invoice creation held for provider reconciliation',409);external=receipt.external_id
    await db.prepare("UPDATE p_amounts SET external_id=?,external_account=?,issued_at=?,accounting_status='issued' WHERE id=? AND external_id IS NULL").bind(external,account,await currentTime(db),amount.id).run()
   }
   const invoice=await providerJson(base(account)+'invoice/'+encodeURIComponent(external),token),remote=invoice.Invoice
   need(remote?.Id===external&&remote.CurrencyRef?.value===amount.currency,'Accounting invoice binding changed',409)
   const mismatch=cents(remote.TotalAmt)!==amount.cents?'Invoice amount differs from accepted schedule':null
   const paid=Math.max(0,cents(remote.TotalAmt)-cents(remote.Balance))
   await db.prepare("UPDATE p_amounts SET remote_paid_cents=?,mismatch=?,accounting_status=? WHERE id=?").bind(mismatch?0:paid,mismatch,mismatch?'mismatch':'synced',amount.id).run()
   if(mismatch)continue
   const offline=(await db.prepare("SELECT p.*,a.cents AS allocated_cents FROM p_payment_records p JOIN p_payment_allocations a ON a.payment_id=p.id WHERE a.amount_id=? AND p.method!='stripe' ORDER BY p.recorded_at,p.id").bind(amount.id).all<any>()).results
   for(const payment of offline)await postPayment(env,amount,customerId,payment.id,payment.allocated_cents,payment.received_on,payment.reference)
   const online=(await db.prepare("SELECT * FROM p_provider_payments WHERE amount_id=? AND state IN ('succeeded','partially_refunded','refunded','disputed')").bind(amount.id).all<any>()).results
   for(const payment of online)await postPayment(env,amount,customerId,'stripe:'+(payment.charge_id??payment.id),payment.cents,today,payment.charge_id??payment.id,true)
   const verifiedBindings=(await db.prepare("SELECT p.* FROM p_payment_records p JOIN p_payment_allocations a ON a.payment_id=p.id WHERE a.amount_id=? AND p.method='stripe' AND NOT EXISTS(SELECT 1 FROM p_provider_payments e WHERE e.charge_id=p.provider_charge)").bind(amount.id).all<any>()).results
   for(const payment of verifiedBindings)await postPayment(env,amount,customerId,'stripe:'+payment.provider_charge,payment.cents,localDate(payment.recorded_at,await installationZone(db)),payment.provider_charge,true)
   const refunds=(await db.prepare("SELECT r.* FROM p_refunds r JOIN p_payment_allocations a ON a.payment_id=r.payment_id WHERE a.amount_id=? AND r.status='succeeded' AND r.provider_refund IS NOT NULL").bind(amount.id).all<any>()).results
   for(const refund of refunds){
    const accepted=await db.prepare('SELECT * FROM p_acceptances WHERE proposal_id=?').bind(amount.proposal_id).first<any>(),lines=await invoiceLines(env,accepted,{...amount,cents:refund.cents,label:'Refund '+amount.label},settings,token,account)
    const receipt=await accountingWrite(env,'refund',refund.id,{CustomerRef:{value:customerId},DepositToAccountRef:{value:settings.clearing_account},CurrencyRef:{value:amount.currency},TxnDate:localDate(refund.completed_at,await installationZone(db)),PaymentRefNum:refund.provider_refund.slice(0,21),PrivateNote:'Refund of invoice '+external+'; Stripe '+refund.provider_refund,Line:lines},'RefundReceipt')
    need(receipt.status==='succeeded','Refund credit held for provider reconciliation',409)
    await db.prepare("INSERT OR IGNORE INTO p_clearing_postings(id,authority,account_id,source_id,kind,cents,clearing_delta,fee_delta,bank_delta,external_id) VALUES(?,?,?,?, 'refund',?,?,0,0,?)").bind(receipt.id,settings.authority,account,refund.provider_refund,refund.cents,-refund.cents,receipt.external_id).run()
   }

  }catch(error){const broken=[401,403].includes((error as any)?.providerStatus);if(broken)await db.prepare("UPDATE p_connections SET broken_at=? WHERE id='workspace:quickbooks' AND account_id=? AND status='connected'").bind(Date.now(),account).run();await db.prepare("UPDATE p_amounts SET accounting_status='held',mismatch=? WHERE id=? AND accounting_status!='mismatch'").bind((error as Error).message.slice(0,300),amount.id).run();if(broken)break}
 }
}
async function postPayment(env:Bindings,amount:any,customerId:string,id:string,n:number,date:string,reference:string,stripe=false){
 const settings=await accountingSettings(env),invoiceId=amount.external_id??(await env.DB.prepare('SELECT external_id FROM p_amounts WHERE id=?').bind(amount.id).first<any>()).external_id
 let receipt=await env.DB.prepare("SELECT * FROM p_accounting_requests WHERE authority=? AND account_id=? AND kind='payment' AND subject=?").bind(settings.authority,settings.account_id,id).first<any>()
 if(receipt){
  const body=JSON.parse(receipt.payload);need(receipt.status==='succeeded'&&body.TotalAmt===n/100&&body.CustomerRef?.value===customerId&&body.Line?.[0]?.LinkedTxn?.[0]?.TxnId===invoiceId,'Payment posting held for provider reconciliation',409)
 }else{
  const {token,account}=await live(env),current=await providerJson(base(account)+'invoice/'+encodeURIComponent(invoiceId),token)
  need(current.Invoice?.Id===invoiceId&&cents(current.Invoice.Balance)>=n,'Accounting already shows payment; match its evidence before posting this receipt',409)
  receipt=await accountingWrite(env,'payment',id,{CustomerRef:{value:customerId},DepositToAccountRef:{value:stripe?settings.clearing_account:settings.bank_account},TotalAmt:n/100,CurrencyRef:{value:amount.currency},TxnDate:date,PaymentRefNum:reference.slice(0,21),PrivateNote:'Platter payment '+reference,Line:[{Amount:n/100,LinkedTxn:[{TxnId:invoiceId,TxnType:'Invoice'}]}]},'Payment')
 }
 need(receipt.status==='succeeded','Payment posting held for provider reconciliation',409)
 if(stripe)await env.DB.prepare("INSERT OR IGNORE INTO p_clearing_postings(id,authority,account_id,source_id,kind,cents,clearing_delta,fee_delta,bank_delta,external_id) VALUES(?,?,?,?, 'gross',?,?,0,0,?)").bind(receipt.id,settings.authority,settings.account_id,reference,n,n,receipt.external_id).run()
}
export async function accountingCommand(env:Bindings,a:Actor,name:string,p:Record<string,unknown>){
 need(financeRoles.includes(a.role),'Only owner, admins and billing reconcile accounting',403)
 if(name==='accounting.match'){
  need(['owner','admin'].includes(a.role),'Only owner and admins match uncertain invoice writes',403)
  need(p.consent===true||p.consent==='yes','Explicitly confirm the exact provider invoice')
  const {settings,account,token}=await live(env),amount=await env.DB.prepare('SELECT * FROM p_amounts WHERE id=?').bind(text(p.amountId,'a scheduled amount',300)).first<any>()
  need(amount&&!amount.external_id,'Choose an issued amount with no confirmed provider binding',409)
  const request=await env.DB.prepare("SELECT * FROM p_accounting_requests WHERE authority=? AND account_id=? AND kind='invoice' AND subject=? AND status IN ('held','claimed')").bind(settings.authority,account,amount.id).first<any>()
  need(request,'No uncertain invoice creation is recorded',409)
  const external=text(p.invoiceId,'the provider invoice id',200),invoice=(await providerJson(base(account)+'invoice/'+encodeURIComponent(external),token)).Invoice,expected=JSON.parse(request.payload)
  need(invoice?.Id===external&&invoice.DocNumber===expected.DocNumber&&invoice.CustomerRef?.value===expected.CustomerRef?.value&&invoice.CurrencyRef?.value===amount.currency&&cents(invoice.TotalAmt)===amount.cents&&invoice.TxnDate===amount.issue_on&&invoice.DueDate===amount.due_on,'The provider invoice does not match the retained exact request',409)
  await commit(env.DB,a,[env.DB.prepare("UPDATE p_amounts SET external_id=?,external_account=?,issued_at=?,accounting_status='synced',mismatch=NULL WHERE id=?").bind(external,account,await currentTime(env.DB),amount.id),env.DB.prepare("UPDATE p_accounting_requests SET external_id=?,status='succeeded' WHERE id=?").bind(external,request.id)],false,{sql:"EXISTS(SELECT 1 FROM p_amounts WHERE id=? AND external_id IS NULL AND version=?)",values:[amount.id,amount.version]})
  return{id:amount.proposal_id,amountId:amount.id,matched:true}
 }
 if(name==='accounting.catalog')return mapCatalog(env,a,p,await live(env))
 if(name==='accounting.configure'){
  need(a.role==='owner','Only the owner chooses invoice authority and posting accounts',403)
  need(p.consent===true||p.consent==='yes','Explicitly authorize customer, invoice and payment transmission to this accounting company')
  const authority=String(p.authority);need(authority==='quickbooks','Only QuickBooks Online synchronization is available in this release')
  const {secret}=await providerCredential(env,'workspace:'+authority),old=await accountingSettings(env)
  need(Number(p.version)===(old?.version??0),'Accounting settings changed. Reload.',409)
  const issued=await env.DB.prepare('SELECT 1 FROM p_accounting_requests LIMIT 1').first()
  need(!issued||old?.authority===authority&&old?.account_id===secret.accountId,'Existing invoices lock this installation to its original authority and company',409)
  const item=text(p.itemId,'the provider item id',100),income=text(p.incomeAccount,'the income account id',100)
  const verified=await providerJson(base(secret.accountId)+'item/'+encodeURIComponent(item),secret.token)
  need(verified.Item?.Id===item&&verified.Item?.IncomeAccountRef?.value===income,'The item must use the selected income account')
  const values=[authority,secret.accountId,item,text(p.taxCode,'a tax code id',100),income,text(p.clearingAccount,'the clearing account id',100),text(p.feeAccount,'the fee expense account id',100),text(p.bankAccount,'the bank account id',100),text(p.remittance,'client-visible remittance instructions',2000),a.id]
  await commit(env.DB,a,[env.DB.prepare('INSERT INTO p_accounting_authority(singleton,settings_version,authorized_by) VALUES(1,?,?) ON CONFLICT(singleton) DO UPDATE SET settings_version=excluded.settings_version,authorized_by=excluded.authorized_by').bind((old?.version??0)+1,a.id),env.DB.prepare('INSERT INTO p_accounting_settings(singleton,authority,account_id,item_id,tax_code,income_account,clearing_account,fee_account,bank_account,remittance,enabled,authorized_by) VALUES(1,?,?,?,?,?,?,?,?,?,1,?) ON CONFLICT(singleton) DO UPDATE SET item_id=excluded.item_id,tax_code=excluded.tax_code,income_account=excluded.income_account,clearing_account=excluded.clearing_account,fee_account=excluded.fee_account,bank_account=excluded.bank_account,remittance=excluded.remittance,enabled=1,authorized_by=excluded.authorized_by,version=p_accounting_settings.version+1').bind(...values)],false,{sql:'COALESCE((SELECT version FROM p_accounting_settings WHERE singleton=1),0)=?',values:[old?.version??0]})
  return {id:'installation',configured:true}
 }
 if(name==='accounting.pause'){need(['owner','admin'].includes(a.role),'Only owner and admins pause synchronization',403);await commit(env.DB,a,[env.DB.prepare('UPDATE p_accounting_settings SET enabled=0,version=version+1 WHERE singleton=1'),env.DB.prepare('DELETE FROM p_accounting_authority')]);return{paused:true}}
 if(name==='accounting.milestone'){const result=await markMilestone(env,a,p);await syncAccounting(env,result.id);return result}
 need(name==='accounting.sync','Unknown accounting action',404);await syncAccounting(env,p.id?text(p.id,'a proposal'):undefined);return{requested:true,message:'Reconciliation finished. Review held or mismatched amounts below.'}
}
