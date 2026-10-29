import type { Bindings } from '../auth.server'
import { commit, need, proposal, exact, snapshot, type Actor } from './model'
import { addDays, calendarDate, currentTime } from './expiry-time'
import { occurrence } from './recurring'
import { editablePackages, pricingInput, pricedOptions, packageInputs } from './pricing'
import { percentBps } from './discounts'
import { documentOf } from './documents/blocks'
import { copyDocumentMedia } from './documents/media'
import { copyAttachments } from './attachments'

const live=`SELECT r.*,o.email FROM p_renewals r
 JOIN p_renewal_authority g ON g.proposal_id=r.proposal_id AND g.version=r.version
 JOIN oa_operators o ON o.id=r.authorized_by AND o.role='owner' AND o.status='active' AND o.version=g.operator_version
 JOIN p_proposals p ON p.id=r.proposal_id AND p.status='accepted'
 JOIN p_clients c ON c.id=p.client_id
 JOIN p_acceptances a ON a.proposal_id=p.id AND a.revision=r.revision`

/** Only the selected immutable agreement supplies renewal content and rates. */
function renewalSource(accepted:any){
 const frozen=JSON.parse(accepted.snapshot),option=frozen.options.find((o:any)=>o.id===accepted.option_id),fees=frozen.selection?.fees
 need(fees?.recurring?.length,'Choose an accepted fixed-term recurring agreement',409)
 need(!frozen.recipient_plan?.length&&!frozen.collectionPolicy?.enabled,'Renewal drafting currently requires a single client with collection off',409)
 const ends=[...new Set<string>(fees.recurring.map((r:any)=>r.renewalOn))]
 need(ends.length===1,'Recurring lines must share one fixed term end before renewal drafting',409)
 need(!frozen.payment_terms?.retainer,'Percentage-based retainers require a separately prepared renewal',409)
 const endsOn=ends[0]
 // Validate the next term as well, before recording unattended draft authority.
 for(const r of fees.recurring)need(occurrence({...r,startsOn:r.renewalOn},r.term)<='9998-12-31','The next term exceeds supported calendar dates',409)
 return {frozen,option,endsOn}
}
function amount(value:unknown){const written=String(value??'');need(/^\d{1,8}(\.\d{1,2})?$/.test(written),'Enter an increase with at most two decimal places');const [whole,fraction='']=written.split('.');return Number(whole)*100+Number(fraction.padEnd(2,'0'))}
function renewalContent(accepted:any,kind:string,value:number){
 const {frozen,option}=renewalSource(accepted),chosen=structuredClone(option),packages=editablePackages([chosen])
 packages[0].optionalItems=[];packages[0].discountExpiresOn=''
 const tables=pricingInput([chosen])
 const items=frozen.selection?.items??[]
 if(items.length)tables.push({optionId:chosen.id,name:'Accepted additions',lines:items.map((i:any)=>({name:i.label,quantity:String(i.quantity),unit:'item',unitPrice:(i.unitCents/100).toFixed(2),...(i.recurrence?{recurrence:i.recurrence}:{}),description:'',group:''}))})
 for(const table of tables)for(const line of table.lines){
  if(!line.recurrence)continue
  const cents=amount(line.unitPrice),next=kind==='percent'?Number((BigInt(cents)*BigInt(10000+value)+5000n)/10000n):cents+value
  need(next>0&&next<=1000000000,'The increased recurring rate exceeds supported pricing',409)
  line.unitPrice=(next/100).toFixed(2)
  line.recurrence={...line.recurrence,startsOn:occurrence(line.recurrence,line.recurrence.term)}
 }
 const options=pricedOptions(packageInputs(packages,tables),tables)
 const document=documentOf(frozen),payment_terms=frozen.payment_terms?structuredClone(frozen.payment_terms):null
 const first=[...frozen.selection.fees.recurring].sort((a:any,b:any)=>a.startsOn.localeCompare(b.startsOn))[0]
 if(payment_terms)for(const milestone of payment_terms.milestones)if(milestone.date)milestone.date=calendarDate(occurrence({...first,startsOn:milestone.date},first.term))
 // The accepted document has already excluded unselected sections and blocks.
 const selectedDocument={...document,blocks:document.blocks.filter(b=>b.type!=='pricing'||b.optionId===chosen.id).map(b=>{const {condition,...block}=b;return block})}
 return {id:'',payment_terms,client_id:frozen.client_id,title:(frozen.title.slice(0,190)+' (renewal)'),scope:frozen.scope,terms:frozen.terms??'',document:selectedDocument,options,deposit_bps:frozen.deposit_bps,currency:frozen.currency,attachments:copyAttachments(frozen.attachments??[]),revision:1}
}
export async function renewalState(db:D1Database,a:Actor){
 if(a.role!=='owner')return undefined
 const rows=(await db.prepare('SELECT r.*,p.title,EXISTS(SELECT 1 FROM ('+live+') active WHERE active.proposal_id=r.proposal_id) AS active FROM p_renewals r JOIN p_proposals p ON p.id=r.proposal_id ORDER BY due_on,r.proposal_id').all<any>()).results
 const agreements=(await db.prepare("SELECT a.*,p.version,p.title FROM p_acceptances a JOIN p_proposals p ON p.id=a.proposal_id WHERE p.status='accepted' ORDER BY p.title,p.id").all<any>()).results.flatMap(a=>{try{const {endsOn}=renewalSource(a);return [{id:a.proposal_id,title:a.title,version:a.version,endsOn}]}catch{return []}})
 return {rows,agreements}
}
export async function renewalCommand(env:Bindings,a:Actor,name:string,input:Record<string,unknown>){
 need(a.role==='owner','Only the current owner authorizes renewal drafting',403)
 const db=env.DB
 if(name==='renewal.run'){await commit(db,a,[]);await runRenewals(env);return {saved:true}}
 const source=await proposal(db,input.id);exact(source,input)
 const old=await db.prepare('SELECT * FROM p_renewals WHERE proposal_id=?').bind(source.id).first<any>()
 need(Number(input.policyVersion)===(old?.version??0),'Renewal settings changed. Reload.',409)
 if(name==='renewal.revoke'){
  need(old,'No renewal authorization exists',409)
  await commit(db,a,[db.prepare('DELETE FROM p_renewal_authority WHERE proposal_id=?').bind(source.id)])
  return {revoked:true}
 }
 need(name==='renewal.configure','Unknown renewal action',404)
 need(!old?.draft_id,'This agreement already has its independent renewal draft',409)
 need(input.consent===true||input.consent==='yes','Explicitly authorize this agreement and its increase')
 const accepted=await db.prepare('SELECT * FROM p_acceptances WHERE proposal_id=?').bind(source.id).first<any>()
 need(source.status==='accepted'&&accepted,'Accept the agreement before authorizing renewal drafting',409)
 const {endsOn}=renewalSource(accepted),kind=String(input.increaseKind)
 need(['percent','fixed'].includes(kind),'Choose a percentage or fixed recurring unit increase')
 const value=kind==='percent'?percentBps(input.increase,'a renewal increase',10000):amount(input.increase)
 renewalContent(accepted,kind,value)
 const operator=await db.prepare('SELECT version FROM oa_operators WHERE id=?').bind(a.id).first<any>(),version=(old?.version??0)+1,at=await currentTime(db)
 need(endsOn>new Date(at).toISOString().slice(0,10),'The agreement term has ended; prepare a renewal manually',409)
 await commit(db,a,[db.prepare(`INSERT INTO p_renewals VALUES(?,?,?,45,?,?,?,?,?,?,NULL,NULL)
 ON CONFLICT(proposal_id) DO UPDATE SET version=excluded.version,ends_on=excluded.ends_on,due_on=excluded.due_on,increase_kind=excluded.increase_kind,increase_value=excluded.increase_value,authorized_by=excluded.authorized_by,authorized_at=excluded.authorized_at`)
 .bind(source.id,accepted.revision,version,endsOn,addDays(endsOn,-45),kind,value,a.id,at),
 db.prepare('INSERT INTO p_renewal_authority VALUES(?,?,?) ON CONFLICT(proposal_id) DO UPDATE SET version=excluded.version,operator_version=excluded.operator_version').bind(source.id,version,operator.version)],false,{sql:"EXISTS(SELECT 1 FROM p_proposals WHERE id=? AND version=? AND status='accepted') AND COALESCE((SELECT version FROM p_renewals WHERE proposal_id=?),0)=? AND NOT EXISTS(SELECT 1 FROM p_renewals WHERE proposal_id=? AND draft_id IS NOT NULL)",values:[source.id,source.version,source.id,old?.version??0,source.id]})
 return {version,dueOn:addDays(endsOn,-45),endsOn}
}
export async function runRenewals(env:Bindings){
 const db=env.DB,at=await currentTime(db),today=new Date(at).toISOString().slice(0,10)
 const due=(await db.prepare('SELECT * FROM ('+live+') WHERE draft_id IS NULL AND due_on<=? AND ends_on>? ORDER BY due_on,proposal_id LIMIT 20').bind(today,today).all<any>()).results
 for(const job of due){
  const accepted=await db.prepare('SELECT * FROM p_acceptances WHERE proposal_id=? AND revision=?').bind(job.proposal_id,job.revision).first<any>()
  if(!accepted)continue
  const id=crypto.randomUUID(),row={...renewalContent(accepted,job.increase_kind,job.increase_value),id},actor:Actor={id:job.authorized_by,email:job.email,role:'owner'}
  try{await commit(db,actor,[
   db.prepare("INSERT INTO p_proposals(id,client_id,title,scope,terms,version,revision,status,deposit_bps,options,prepared_by,created_at,currency,sales_owner_id,sales_owner_name,attachments,document,payment_terms) VALUES(?,?,?,?,?,1,1,'draft',?,?,?,?,?,?,?,?,?,?)").bind(id,row.client_id,row.title,row.scope,row.terms,row.deposit_bps,JSON.stringify(row.options),actor.email,at,row.currency,actor.id,actor.email,JSON.stringify(row.attachments),JSON.stringify(row.document),row.payment_terms?JSON.stringify(row.payment_terms):null),
   copyDocumentMedia(db,job.proposal_id,id,row.document),
   db.prepare('INSERT INTO p_template_sources(proposal_id,template_id,template_version) SELECT ?,template_id,template_version FROM p_template_sources WHERE proposal_id=?').bind(id,job.proposal_id),
   db.prepare('INSERT INTO p_revisions(proposal_id,revision,snapshot,prepared_by,prepared_at,currency) VALUES(?,1,?,?,?,?)').bind(id,JSON.stringify(snapshot(row)),actor.email,at,row.currency),
   db.prepare('UPDATE p_renewals SET draft_id=?,drafted_at=? WHERE proposal_id=?').bind(id,at,job.proposal_id),
   db.prepare('DELETE FROM p_renewal_authority WHERE proposal_id=?').bind(job.proposal_id),
   db.prepare("INSERT INTO p_audit(id,actor_id,actor_role,action,subject,occurred_at) VALUES(?,?,'owner','renewal.drafted',?,?)").bind(crypto.randomUUID(),actor.id,id,at)
  ],false,{sql:'EXISTS(SELECT 1 FROM ('+live+') active WHERE active.proposal_id=? AND active.version=? AND active.draft_id IS NULL AND active.due_on<=? AND active.ends_on>?)',values:[job.proposal_id,job.version,today,today]})}
  catch(error){if((error as any)?.status!==409)throw error}
 }
}
