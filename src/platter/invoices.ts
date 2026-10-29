// Glove's Xero column layout and retained once-only export, adapted for deposits.
import { need,text,commit,type Actor } from './model'
const columns=['*ContactName','EmailAddress','POAddressLine1','*InvoiceNumber','Reference','*InvoiceDate','*DueDate','*Description','*Quantity','*UnitAmount','*AccountCode','*TaxType','Currency']
// Prevent spreadsheet formula interpretation of user-controlled cells.
export const cell=(v:string)=>{v=/^[=+@\-\t\r]/.test(v)?"'"+v:v;return /[",\r\n]/.test(v)?`"${v.replaceAll('"','""')}"`:v}
// One deposit invoice row in Xero's import layout, from the frozen acceptance.
export function invoiceFile(proposalId:string,accepted:any,at:number){const snap=JSON.parse(accepted.snapshot),currency=accepted.currency??'AUD',number='PL-'+proposalId.replaceAll('-','').toUpperCase(),date=new Date(at).toISOString().slice(0,10),formatDate=(v:string)=>`${v.slice(8,10)}/${v.slice(5,7)}/${v.slice(0,4)}`
 const csv=[columns,[snap.clientName,accepted.email,'',number,snap.title,formatDate(date),formatDate(date),'Deposit: '+snap.title,'1',(accepted.deposit_cents/100).toFixed(2),'200',currency==='AUD'?'GST Free Income':'No Tax',currency]].map(row=>row.map(cell).join(',')).join('\r\n')+'\r\n'
 return{number,csv,currency}
}
export async function exportInvoice(db:D1Database,a:Actor,p:Record<string,unknown>){need(a.role==='owner','Only the owner exports deposits',403);const id=text(p.id,'a proposal'),existing=await db.prepare('SELECT * FROM p_invoices WHERE proposal_id=?').bind(id).first<any>();if(existing)return existing
 need(!await db.prepare('SELECT 1 FROM p_invoice_authority').first(),'Use the selected invoice authority; duplicate export is refused',409);const accepted=await db.prepare('SELECT * FROM p_acceptances WHERE proposal_id=?').bind(id).first<any>();need(accepted,'A client must accept before a deposit is exported',409);need(!JSON.parse(accepted.snapshot).selection?.tax,'Accounting export for taxed agreements is not supported. The tax-inclusive deposit is retained in the agreement.',409);const at=Date.now(),{number,csv,currency}=invoiceFile(id,accepted,at)
 await commit(db,a,[db.prepare('INSERT OR IGNORE INTO p_invoices(id,proposal_id,number,csv,exported_at,exported_by,currency) VALUES(?,?,?,?,?,?,?)').bind(crypto.randomUUID(),id,number,csv,at,a.email,currency)],true,{sql:'NOT EXISTS(SELECT 1 FROM p_invoice_authority) AND NOT EXISTS(SELECT 1 FROM p_qbo_invoices WHERE proposal_id=?)',values:[id]})
 return await db.prepare('SELECT * FROM p_invoices WHERE proposal_id=?').bind(id).first<any>()
}
