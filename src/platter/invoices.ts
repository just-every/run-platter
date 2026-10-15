// Glove's Xero column layout and retained once-only export, adapted for deposits.
import { need,text,commit,type Actor } from './model'
const columns=['*ContactName','EmailAddress','POAddressLine1','*InvoiceNumber','Reference','*InvoiceDate','*DueDate','*Description','*Quantity','*UnitAmount','*AccountCode','*TaxType','Currency']
// Prevent spreadsheet formula interpretation of user-controlled cells.
const cell=(v:string)=>{v=/^[=+@\-\t\r]/.test(v)?"'"+v:v;return /[",\r\n]/.test(v)?`"${v.replaceAll('"','""')}"`:v}
export async function exportInvoice(db:D1Database,a:Actor,p:Record<string,unknown>){need(a.role==='owner','Only the owner exports deposits',403);const id=text(p.id,'a proposal'),existing=await db.prepare('SELECT * FROM p_invoices WHERE proposal_id=?').bind(id).first<any>();if(existing)return existing
 const accepted=await db.prepare('SELECT * FROM p_acceptances WHERE proposal_id=?').bind(id).first<any>();need(accepted,'A client must accept before a deposit is exported',409);const snap=JSON.parse(accepted.snapshot),at=Date.now(),number='PL-'+id.replaceAll('-','').toUpperCase(),date=new Date(at).toISOString().slice(0,10),formatDate=(v:string)=>`${v.slice(8,10)}/${v.slice(5,7)}/${v.slice(0,4)}`
 const csv=[columns,[snap.clientName,accepted.email,'',number,snap.title,formatDate(date),formatDate(date),'Deposit: '+snap.title,'1',(accepted.deposit_cents/100).toFixed(2),'200','GST Free Income','AUD']].map(row=>row.map(cell).join(',')).join('\r\n')+'\r\n'
 await commit(db,a,[db.prepare('INSERT OR IGNORE INTO p_invoices(id,proposal_id,number,csv,exported_at,exported_by) VALUES(?,?,?,?,?,?)').bind(crypto.randomUUID(),id,number,csv,at,a.email)],true)
 return await db.prepare('SELECT * FROM p_invoices WHERE proposal_id=?').bind(id).first<any>()
}
