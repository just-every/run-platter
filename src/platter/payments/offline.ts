import type { Bindings } from '../../auth.server'
import { commit, dollars, hash, need, text, type Actor } from '../model'
import { currentTime, localDate } from '../expiry-time'
import { installationZone } from '../reports/report-state'
import { calendar } from './schedule'
import { ensureAmounts, amountRows, financeRoles } from '../accounting/amounts'
import { syncAccounting } from '../accounting/quickbooks'
export async function recordOffline(env:Bindings,a:Actor,p:Record<string,unknown>){
 need(financeRoles.includes(a.role),'Only owner, admins and billing record received payments',403)
 const db=env.DB,id=text(p.id,'a proposal'),amountId=text(p.amountId,'a scheduled amount',300)
 await ensureAmounts(env,id)
 const amount=(await amountRows(env,id)).find(r=>r.id===amountId)
 need(amount,'Scheduled amount not found',404);need(amount.state!=='scheduled','This amount is not issued yet',409)
 const method=String(p.method);need(['check','wire','ach_credit'].includes(method),'Choose check, wire or ACH credit')
 const receivedOn=calendar(p.receivedOn);need(receivedOn<=localDate(await currentTime(db),await installationZone(db)),'A received payment cannot have a future date')
 const cents=dollars(p.amount),reference=text(p.reference,'a payment reference',200),requestId=text(p.requestId,'a receipt request id',100)
 need(/^[A-Za-z0-9_-]+$/.test(requestId),'Use an opaque receipt request id')
 need(p.consent===true||p.consent==='yes','Confirm that the money was received')
 const fingerprint=await hash(JSON.stringify({id,amountId,method,receivedOn,cents,reference})),prior=await db.prepare('SELECT * FROM p_offline_requests WHERE id=? OR (amount_id=? AND fingerprint=?)').bind(requestId,amountId,fingerprint).first<any>()
 if(prior){need(prior.fingerprint===fingerprint,'This receipt id already names another payment',409);return{id:prior.payment_id,proposalId:id,recorded:true}}
 need(cents<=amount.cents-amount.paidCents,'Payment exceeds the unpaid scheduled amount',409)
 const accepted=await db.prepare('SELECT * FROM p_acceptances WHERE proposal_id=?').bind(id).first<any>(),recordId=crypto.randomUUID()
 await commit(db,a,[
  db.prepare('INSERT INTO p_payment_records(id,proposal_id,revision,currency,cents,method,reference,received_on,recorded_by,recorded_at) VALUES(?,?,?,?,?,?,?,?,?,?)').bind(recordId,id,accepted.revision,accepted.currency,cents,method,reference,receivedOn,a.id,await currentTime(db)),
  db.prepare('INSERT INTO p_payment_allocations(payment_id,amount_id,cents) VALUES(?,?,?)').bind(recordId,amountId,cents),
  db.prepare('INSERT INTO p_offline_requests(id,payment_id,amount_id,fingerprint) VALUES(?,?,?,?)').bind(requestId,recordId,amountId,fingerprint),
  db.prepare('UPDATE p_amounts SET version=version+1 WHERE id=?').bind(amountId),
 ],false,{sql:'EXISTS(SELECT 1 FROM p_amounts WHERE id=? AND version=?)',values:[amountId,amount.version]})
 await syncAccounting(env,id)
 return{id:recordId,proposalId:id,recorded:true}
}

export async function allocateOffline(env:Bindings,a:Actor,p:Record<string,unknown>){
 need(financeRoles.includes(a.role),'Only owner, admins and billing allocate receipts',403)
 need(p.consent===true||p.consent==='yes','Confirm matching this received receipt to the scheduled amount')
 const payment=await env.DB.prepare("SELECT * FROM p_payment_records WHERE id=? AND method!='stripe'").bind(text(p.paymentId,'a received offline payment',300)).first<any>()
 need(payment,'Received payment not found',404);await ensureAmounts(env,payment.proposal_id)
 const amount=(await amountRows(env,payment.proposal_id)).find(r=>r.id===p.amountId)
 need(amount&&amount.state!=='scheduled','Choose an issued amount on the same agreement',409)
 const old=await env.DB.prepare('SELECT * FROM p_payment_allocations WHERE payment_id=?').bind(payment.id).first<any>()
 if(old){need(old.amount_id===amount.id,'This receipt is already allocated elsewhere',409);return{id:payment.id,proposalId:payment.proposal_id}}
 need(payment.currency===amount.currency&&payment.cents<=amount.cents-amount.paidCents,'The received amount exceeds this unpaid invoice',409)
 await commit(env.DB,a,[env.DB.prepare('INSERT INTO p_payment_allocations(payment_id,amount_id,cents) VALUES(?,?,?)').bind(payment.id,amount.id,payment.cents),env.DB.prepare('UPDATE p_amounts SET version=version+1 WHERE id=?').bind(amount.id)],false,{sql:'EXISTS(SELECT 1 FROM p_amounts WHERE id=? AND version=?)',values:[amount.id,amount.version]})
 await syncAccounting(env,payment.proposal_id);return{id:payment.id,proposalId:payment.proposal_id}
}
