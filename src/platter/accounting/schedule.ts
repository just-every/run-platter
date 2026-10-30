import type { Bindings } from '../../auth.server'
import { commit, need, text, type Actor } from '../model'
import { addDays, currentTime, localDate } from '../expiry-time'
import { installationZone } from '../reports/report-state'
import { invoiceLines, recheckLines } from './lines'
import { canonical, configuration, configGuard, execution } from './jobs'
import { confirmedInvoice, itemMapping, providerId, quickbooks } from './quickbooks'

export function scheduleRows(snapshot:any) {
 const rows=snapshot.paymentSchedule?.rows
 need(Array.isArray(rows)&&rows.length>1&&rows[0].kind==='deposit','The accepted agreement needs an explicit payment schedule',409)
 need(rows.length<=1000,'This schedule requires manual accounting review',409)
 for(const row of rows) need(Number.isSafeInteger(row.amountCents)&&row.amountCents>=0&&Number.isInteger(row.netDays)&&row.netDays>=0&&row.netDays<=365&&(row.date||row.event),'The accepted schedule is incomplete',409)
 return rows
}
export async function markMilestone(env:Bindings,actor:Actor,input:Record<string,unknown>) {
 const db=env.DB,id=text(input.proposalId,'an accounting agreement'),index=Number(input.amountIndex)
 const job=await db.prepare("SELECT * FROM p_accounting_jobs WHERE proposal_id=? AND status='complete'").bind(id).first<any>()
 need(job,'Issue the confirmed deposit first',409)
 await execution(env,job)
 const config=await configuration(env),row=await db.prepare('SELECT * FROM p_accounting_amounts WHERE proposal_id=? AND amount_index=?').bind(id,index).first<any>()
 need(row&&row.status==='scheduled'&&!row.event_at,'Choose an uncompleted scheduled milestone',409)
 const amount=JSON.parse(row.row_json)
 need(amount.kind==='milestone'&&amount.event&&amount.event===input.event&&(input.consent===true||input.consent==='yes'),'Explicitly confirm the exact accepted milestone event',409)
 const guard=configGuard(config)
 guard.sql+=" AND EXISTS(SELECT 1 FROM p_accounting_amounts WHERE proposal_id=? AND amount_index=? AND status='scheduled' AND event_at IS NULL)"
 guard.values.push(id,index)
 await commit(db,actor,[db.prepare('UPDATE p_accounting_amounts SET event_at=?,event_by=? WHERE proposal_id=? AND amount_index=?').bind(await currentTime(db),actor.id,id,index)],false,guard)
 return {accountingResult:true,status:'scheduled',message:'Milestone completion is recorded. Its invoice will be issued by the accounting dispatcher.'}
}
export async function runScheduledInvoices(env:Bindings) {
 const db=env.DB,now=await currentTime(db),zone=await installationZone(db),day=localDate(now,zone)
 await db.prepare("UPDATE p_accounting_amounts SET status='held',reason='Interrupted invoice request. Reconcile in QuickBooks; no blind replay.' WHERE status='running' AND started_at<?").bind(now-900000).run()
 const amounts=(await db.prepare("SELECT a.*,j.plan AS job_plan FROM p_accounting_amounts a JOIN p_accounting_jobs j ON j.proposal_id=a.proposal_id JOIN p_accounting_job_authority g ON g.proposal_id=j.proposal_id WHERE a.status='scheduled' AND j.status='complete' AND (a.event_at IS NOT NULL OR json_extract(a.row_json,'$.event')='Acceptance' OR json_extract(a.row_json,'$.date')<=?) ORDER BY a.proposal_id,a.amount_index LIMIT 20").bind(day).all<any>()).results
 for(const amount of amounts) {
  const row=JSON.parse(amount.row_json),plan=JSON.parse(amount.job_plan),issueDay=row.date??localDate(amount.event_at??plan.acceptedAt,zone),dueOn=addDays(issueDay,row.netDays),requestId=crypto.randomUUID()
  const claimed=await db.prepare("UPDATE p_accounting_amounts SET status='running',request_id=?,issued_on=?,due_on=?,started_at=? WHERE proposal_id=? AND amount_index=? AND status='scheduled' RETURNING proposal_id").bind(requestId,issueDay,dueOn,now,amount.proposal_id,amount.amount_index).first()
  if(!claimed)continue
  try {
   const job=await db.prepare('SELECT * FROM p_accounting_jobs WHERE proposal_id=?').bind(amount.proposal_id).first<any>(),plan=JSON.parse(job.plan),authorize=()=>execution(env,job)
   await authorize()
   if(plan.lineDetails)await recheckLines(authorize,plan)
   need(canonical(await itemMapping(authorize,plan.mapping.itemId,plan.mapping.accountId))===canonical(plan.mapping),'The reviewed accounting mapping changed',409)
   const customer=await db.prepare("SELECT provider_id FROM p_accounting_customers WHERE account_id=? AND client_id=? AND status='complete'").bind(job.account_id,job.client_id).first<any>()
   need(customer,'The retained customer mapping is unavailable',409)
   const body={CustomerRef:{value:customer.provider_id},DocNumber:(plan.number.slice(0,15)+'-'+amount.amount_index).slice(0,21),PrivateNote:'Platter schedule '+plan.proposalId+' amount '+amount.amount_index,TxnDate:issueDay,DueDate:dueOn,CurrencyRef:{value:'USD'},...invoiceLines(plan,amount.amount_cents,amount.amount_index)}
   // The once-only row is already claimed before retaining and sending these bytes.
   await db.prepare('UPDATE p_accounting_amounts SET request_body=? WHERE proposal_id=? AND amount_index=?').bind(canonical(body),amount.proposal_id,amount.amount_index).run()
   const invoice=(await quickbooks(authorize,'/invoice',body,requestId)).Invoice
   confirmedInvoice(invoice,body,amount.amount_cents)
   await db.prepare("UPDATE p_accounting_amounts SET status='complete',provider_id=?,completed_at=? WHERE proposal_id=? AND amount_index=?").bind(providerId(invoice.Id),await currentTime(db),amount.proposal_id,amount.amount_index).run()
  } catch {
   await db.prepare("UPDATE p_accounting_amounts SET status='held',reason='Scheduled invoice held. Reconcile authority, mapping and provider receipts; no automatic replay.' WHERE proposal_id=? AND amount_index=?").bind(amount.proposal_id,amount.amount_index).run()
  }
 }
}
