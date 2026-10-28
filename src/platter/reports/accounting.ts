import type { Bindings } from '../../auth.server'
import { providerCredential, providerJson } from '../connections'
import { commit, need, text, type Actor } from '../model'

function providerDate(value:unknown) {
 const date=String(value??'')
 need(/^\d{4}-\d{2}-\d{2}$/.test(date)&&Number.isFinite(Date.parse(date))&&new Date(date).toISOString().slice(0,10)===date,'QuickBooks returned an invalid invoice date',409)
 return date
}
function providerCents(value:unknown) {
 need(typeof value==='number'&&Number.isFinite(value)&&value>=0&&Number.isSafeInteger(Math.round(value*100))&&Math.abs(value*100-Math.round(value*100))<0.0001,'QuickBooks returned an invalid invoice amount',409)
 return Math.round(value*100)
}

/** Explicitly read an existing invoice. This command never creates an invoice or moves money. */
export async function refreshRevenueInvoice(env:Bindings,a:Actor,p:Record<string,unknown>) {
 need(['owner','admin'].includes(a.role),'Only owner and admins link accounting invoices',403)
 const db=env.DB,id=text(p.id,'an accepted proposal'),invoiceId=text(p.invoiceId,'the QuickBooks invoice id',100)
 need(/^[A-Za-z0-9_-]+$/.test(invoiceId),'Use an invoice id, not an invoice number')
 need(p.consent===true||p.consent==='yes','Confirm that this existing invoice belongs to the accepted agreement')
 const acceptance=await db.prepare('SELECT revision,currency FROM p_acceptances WHERE proposal_id=?').bind(id).first<any>()
 need(acceptance,'Accept the proposal before linking an invoice',409)
 const {connection,secret}=await providerCredential(env,'workspace:quickbooks')
 need(!await db.prepare('SELECT 1 FROM p_revenue_invoices WHERE account_id!=?').bind(connection.account_id).first(),'Revenue snapshots belong to another accounting company. Reconnect that company.',409)
 const old=await db.prepare('SELECT * FROM p_revenue_invoices WHERE account_id=? AND invoice_id=?').bind(connection.account_id,invoiceId).first<any>()
 need(!old||old.proposal_id===id,'This invoice already belongs to another agreement',409)
 const version=Number(p.version)
 need(Number.isInteger(version)&&version===(old?.version??0),'Invoice snapshot changed. Reload before refreshing.',409)
 const result=await providerJson('https://quickbooks.api.intuit.com/v3/company/'+encodeURIComponent(connection.account_id)+'/invoice/'+encodeURIComponent(invoiceId),secret.token),invoice=result.Invoice
 need(invoice&&invoice.Id===invoiceId&&invoice.CurrencyRef?.value===acceptance.currency,'QuickBooks invoice identity or currency does not match the agreement',409)
 need(/^\d+$/.test(String(invoice.SyncToken))&&Number.isSafeInteger(Number(invoice.SyncToken)),'QuickBooks returned an invalid invoice revision',409)
 const token=Number(invoice.SyncToken)
 need(!old||token>=old.sync_token,'QuickBooks returned an older invoice revision',409)
 const issued=providerDate(invoice.TxnDate),due=providerDate(invoice.DueDate),total=providerCents(invoice.TotalAmt),balance=providerCents(invoice.Balance)
 need(due>=issued&&balance<=total,'QuickBooks invoice dates or balance are inconsistent',409)
 if(old&&token===old.sync_token)need(old.issued_on===issued&&old.due_on===due&&old.total_cents===total,'QuickBooks changed an invoice without a new revision',409)
 await commit(db,a,[db.prepare('INSERT INTO p_revenue_invoices(account_id,invoice_id,proposal_id,revision,currency,issued_on,due_on,total_cents,balance_cents,sync_token,observed_at,recorded_by) VALUES(?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(account_id,invoice_id) DO UPDATE SET issued_on=excluded.issued_on,due_on=excluded.due_on,total_cents=excluded.total_cents,balance_cents=excluded.balance_cents,sync_token=excluded.sync_token,observed_at=excluded.observed_at,recorded_by=excluded.recorded_by,version=p_revenue_invoices.version+1')
  .bind(connection.account_id,invoiceId,id,acceptance.revision,acceptance.currency,issued,due,total,balance,token,Date.now(),a.id)],false,{
   sql:"EXISTS(SELECT 1 FROM p_connections WHERE id='workspace:quickbooks' AND account_id=? AND version=? AND status='connected' AND broken_at IS NULL) AND COALESCE((SELECT version FROM p_revenue_invoices WHERE account_id=? AND invoice_id=?),0)=? AND EXISTS(SELECT 1 FROM p_acceptances WHERE proposal_id=? AND revision=? AND currency=?)",
   values:[connection.account_id,connection.version,connection.account_id,invoiceId,version,id,acceptance.revision,acceptance.currency],
  })
 return {id,invoiceId,version:version+1}
}
