import { demoEffect } from '@runeditrun/rer/internal/modules/demo/index.mjs'
import type { Bindings } from '../auth.server'
import { providerCredential, providerJson } from './connections'
import { actorById } from './credentials'
import { canonical } from './crm/hubspot-draft'
import { currentTime } from './expiry-time'
import { commit, hash, need, text, type Actor } from './model'
import { permitted } from './permissions'

const identifier=(value:unknown)=>{const id=text(value,'a QuickBooks identifier',100);need(/^[A-Za-z0-9_-]+$/.test(id),'Use a QuickBooks identifier');return id}
const base=(account:string)=>'https://quickbooks.api.intuit.com/v3/company/'+encodeURIComponent(account)
async function plan(env:Bindings,actor:Actor,input:Record<string,unknown>){
 need(actor.role==='owner','Only the owner reviews collected fields for accounting',403)
 const db=env.DB,row=await permitted(db,actor,input.id)
 need(row.version===Number(input.version)&&row.status==='accepted','Review the current accepted proposal',409)
 const accepted=await db.prepare('SELECT * FROM p_acceptances WHERE proposal_id=? AND revision=?').bind(row.id,row.revision).first<any>()
 need(accepted&&accepted.currency==='USD','This accounting door requires an accepted USD agreement',409)
 const frozen=JSON.parse(accepted.snapshot)
 need(!frozen.selection?.tax&&!frozen.payment_terms&&!frozen.collectionPolicy?.enabled,'Taxed or scheduled invoices need accounting preparation',409)
 const {connection,secret}=await providerCredential(env,'workspace:quickbooks')
 need(!connection.broken_at,'Reconnect QuickBooks before reviewing',409)
 const authority=await db.prepare("SELECT 1 FROM p_invoice_authority a JOIN p_invoice_authority_grants g ON g.singleton=a.singleton WHERE a.provider='quickbooks' AND g.actor_id=? AND g.account_id=? AND g.connection_version=?").bind(actor.id,connection.account_id,connection.version).first()
 need(authority,'Explicitly select QuickBooks as invoice authority for this connection',409)
 const customerId=identifier(input.customerId),itemId=identifier(input.itemId),poField=text(input.poField,'the accepted PO field'),billingField=text(input.billingField,'the accepted billing-address field')
 need(poField!==billingField,'Choose separate PO and billing fields')
 const po=frozen.fieldValues?.[poField],billing=frozen.fieldValues?.[billingField]
 need(typeof po==='string'&&po.length>0&&typeof billing==='string'&&billing.length>0,'The agreement must retain both collected values',409)
 const lines=billing.split(/\r?\n/);need(lines.length<=5&&lines.every((line:string)=>line.length<=255)&&po.length<=980,'Prepare this address or PO for the accounting provider',409)
 const [customer,item]=await Promise.all([providerJson(base(connection.account_id)+'/customer/'+customerId,secret.token),providerJson(base(connection.account_id)+'/item/'+itemId,secret.token)])
 need(customer.Customer?.Id===customerId&&customer.Customer.Active!==false&&String(customer.Customer.PrimaryEmailAddr?.Address).toLowerCase()===accepted.email.toLowerCase(),'The selected customer must match the accepted billing recipient',409)
 need(item.Item?.Id===itemId&&item.Item.Active!==false&&item.Item.Type==='Service'&&item.Item.IncomeAccountRef?.value,'Choose a verified active accounting service item',409)
 const payload={CustomerRef:{value:customerId},CurrencyRef:{value:'USD'},TxnDate:new Date(accepted.accepted_at).toISOString().slice(0,10),CustomerMemo:{value:'PO number: '+po},BillAddr:Object.fromEntries(lines.map((line:string,index:number)=>['Line'+(index+1),line])),Line:[{Amount:accepted.deposit_cents/100,DetailType:'SalesItemLineDetail',Description:'Deposit: '+frozen.title,SalesItemLineDetail:{ItemRef:{value:itemId},Qty:1,UnitPrice:accepted.deposit_cents/100,TaxCodeRef:{value:'NON'}}}]}
 return {row,connection,payload,source:canonical({customer,item}),mapping:{customerId,itemId,poField,billingField}}
}
function guard(review:any){return {sql:"EXISTS(SELECT 1 FROM p_proposals WHERE id=? AND version=? AND revision=? AND status='accepted') AND EXISTS(SELECT 1 FROM p_connections c JOIN p_connection_secrets s ON s.connection_id=c.id WHERE c.id='workspace:quickbooks' AND c.version=? AND c.account_id=? AND c.status='connected' AND c.broken_at IS NULL) AND EXISTS(SELECT 1 FROM p_invoice_authority a JOIN p_invoice_authority_grants g ON g.singleton=a.singleton WHERE a.provider='quickbooks' AND g.actor_id=? AND g.account_id=? AND g.connection_version=?) AND NOT EXISTS(SELECT 1 FROM p_invoices WHERE proposal_id=?)",values:[review.proposal_id,review.proposal_version,review.revision,review.connection_version,review.account_id,review.actor_id,review.account_id,review.connection_version,review.proposal_id]}}
export async function quickbooksInvoiceCommand(env:Bindings,actor:Actor,name:string,input:Record<string,unknown>){
 need(actor.role==='owner','Only the owner authorizes accounting exports',403)
 const db=env.DB,at=await currentTime(db)
 if(name==='invoice.authority'){
  need(input.provider==='quickbooks'&&(input.consent===true||input.consent==='yes'),'Explicitly select QuickBooks as the invoice authority')
  const {connection}=await providerCredential(env,'workspace:quickbooks');need(!connection.broken_at,'Reconnect QuickBooks',409)
  await commit(db,actor,[db.prepare("INSERT INTO p_invoice_authority VALUES(1,'quickbooks',?) ON CONFLICT DO UPDATE SET selected_at=excluded.selected_at").bind(at),db.prepare('INSERT INTO p_invoice_authority_grants VALUES(1,?,?,?) ON CONFLICT DO UPDATE SET actor_id=excluded.actor_id,account_id=excluded.account_id,connection_version=excluded.connection_version').bind(actor.id,connection.account_id,connection.version)],true,{sql:'NOT EXISTS(SELECT 1 FROM p_invoices) AND NOT EXISTS(SELECT 1 FROM p_qbo_invoices WHERE account_id!=?) AND EXISTS(SELECT 1 FROM p_connections WHERE id=\'workspace:quickbooks\' AND version=? AND status=\'connected\' AND broken_at IS NULL)',values:[connection.account_id,connection.version]})
  return {provider:'quickbooks'}
 }
 if(name==='invoice.qbo.review'){
  const checked=await plan(env,actor,input),payload=canonical(checked.payload),source=checked.source,digest=await hash(payload+'\n'+source),id=crypto.randomUUID()
  const review={proposal_id:checked.row.id,proposal_version:checked.row.version,revision:checked.row.revision,connection_version:checked.connection.version,account_id:checked.connection.account_id,actor_id:actor.id}
  await commit(db,actor,[db.prepare('INSERT INTO p_qbo_invoice_reviews VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,NULL)').bind(id,review.proposal_id,review.revision,review.proposal_version,actor.id,actor.memberVersion??0,review.connection_version,review.account_id,canonical(checked.mapping),payload,source,digest,at)],true,guard(review))
  return {id,digest,payload:checked.payload,accountId:review.account_id,customerId:checked.mapping.customerId}
 }
 if(name==='invoice.qbo.status'){await permitted(db,actor,input.id);const receipt=await db.prepare('SELECT * FROM p_qbo_invoices WHERE proposal_id=?').bind(input.id).first();need(receipt,'This proposal has no accounting export',404);return receipt}
 need(name==='invoice.qbo.apply','Unknown accounting export action',404)
 need(input.consent===true||input.consent==='yes','Authorize the exact reviewed accounting values')
 const review=await db.prepare('SELECT * FROM p_qbo_invoice_reviews WHERE id=? AND actor_id=?').bind(text(input.id,'a review'),actor.id).first<any>()
 need(review&&!review.consumed_at&&review.created_at>at-900000&&review.digest===input.digest&&review.actor_version===(actor.memberVersion??0),'Reviewed accounting bytes or authority changed',409)
 const checked=await plan(env,actor,{id:review.proposal_id,version:review.proposal_version,...JSON.parse(review.mapping)})
 need(checked.connection.version===review.connection_version&&checked.connection.account_id===review.account_id&&canonical(checked.payload)===review.payload&&checked.source===review.source,'The accounting destination or reviewed values changed',409)
 const g=guard(review);g.sql+=' AND EXISTS(SELECT 1 FROM p_qbo_invoice_reviews WHERE id=? AND consumed_at IS NULL)';g.values.push(review.id)
 await commit(db,actor,[db.prepare('UPDATE p_qbo_invoice_reviews SET consumed_at=? WHERE id=?').bind(at,review.id),db.prepare("INSERT INTO p_qbo_invoices VALUES(?,?,?,?,?,?,?,?,'sending',NULL)").bind(review.proposal_id,review.revision,review.account_id,checked.mapping.customerId,review.payload,review.digest,actor.id,at)],true,g)
 try{
  const liveActor=await actorById(db,actor.id);need(liveActor?.role==='owner','The owner changed before accounting export',409)
  await commit(db,liveActor,[],true,guard(review))
  const {secret,connection}=await providerCredential(env,'workspace:quickbooks')
  need(connection.version===review.connection_version&&connection.account_id===review.account_id,'Accounting connection changed',409)
  await commit(db,liveActor,[],true,guard(review))
  const invoice=await demoEffect(async()=>{
  const response=await fetch(base(review.account_id)+'/invoice?requestid='+encodeURIComponent('platter-'+review.proposal_id),{method:'POST',headers:{authorization:'Bearer '+secret.token,'content-type':'application/json',accept:'application/json'},body:review.payload,redirect:'manual',signal:AbortSignal.timeout(30000)})
  need(response.ok,'QuickBooks did not confirm this invoice',409)
  const raw=await response.text();need(raw.length<=262144,'QuickBooks response was too large',409);return JSON.parse(raw).Invoice
  },()=>({...checked.payload,Id:'demo-'+review.proposal_id,TotalAmt:checked.payload.Line[0].Amount}))
  need(typeof invoice?.Id==='string'&&invoice.Id&&invoice.CustomerRef?.value===checked.mapping.customerId&&Math.round(invoice.TotalAmt*100)===Math.round(checked.payload.Line[0].Amount*100)&&Object.entries(checked.payload.BillAddr).every(([key,value])=>invoice.BillAddr?.[key]===value)&&invoice.CurrencyRef?.value==='USD'&&invoice.CustomerMemo?.value===checked.payload.CustomerMemo.value,'QuickBooks returned different accounting facts',409)
  await db.prepare("UPDATE p_qbo_invoices SET status='confirmed',provider_id=? WHERE proposal_id=?").bind(invoice.Id,review.proposal_id).run()
 }catch{
  await db.prepare("UPDATE p_qbo_invoices SET status='uncertain' WHERE proposal_id=?").bind(review.proposal_id).run()
 }
 return await db.prepare('SELECT * FROM p_qbo_invoices WHERE proposal_id=?').bind(review.proposal_id).first()
}
