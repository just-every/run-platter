import type { Bindings } from '../../auth.server'
import { actorById } from '../credentials'
import { addDays, currentTime, startOfDate } from '../expiry-time'
import { commit, need, text, type Actor } from '../model'
import { permitted, senders } from '../permissions'
import { installationZone } from '../reports/report-state'
import { consentCurrent, noticeConsentJoin, currentSender, noticeWrites, noticeChannelAllowed } from './expiry'

/** Term boundaries come only from the selected, immutable accepted fees. */
export function renewalTerms(snapshot:string){
 const rows=JSON.parse(snapshot).selection?.fees?.recurring??[]
 const dates=[...new Set<string>(rows.map((r:any)=>r.renewalOn).filter((value:any)=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)))]
 return dates.sort().map(renewsOn=>({renewsOn,termEnd:addDays(renewsOn,-1)}))
}
const join=noticeConsentJoin('renewal')
const select=`SELECT p.id,p.version AS proposal_version,p.revision,p.sales_owner_id,x.snapshot,s.enabled,s.lead_days,s.version AS settings_version,s.email_enabled,s.slack_route,c.id AS consent_id
 FROM p_proposals p JOIN p_acceptances x ON x.proposal_id=p.id AND x.revision=p.revision
 JOIN p_renewal_notice_settings s ON s.proposal_id=p.id ${join}
 WHERE ${consentCurrent} AND p.status='accepted' AND s.enabled=1`

async function recipient(env:Bindings,row:any){
 const owner=await actorById(env.DB,row.sales_owner_id)
 if(!owner||!senders.includes(owner.role)||!await currentSender(env.DB,row.consent_id,row.id))return
 try{await permitted(env.DB,owner,row.id,'send');return owner}catch{return}
}
export async function activeRenewalNotice(env:Bindings,mail:any){
 const run=await env.DB.prepare("SELECT * FROM p_sender_notice_runs WHERE id=? AND kind='renewal'").bind(mail.event_key).first<any>()
 if(!run)return false
 const row=await env.DB.prepare(select+' AND p.id=?').bind(run.proposal_id).first<any>()
 if(!row||row.revision!==run.revision||row.settings_version!==run.settings_version||row.sales_owner_id!==run.owner_id)return false
 const term=renewalTerms(row.snapshot).find(r=>r.termEnd===run.term_end)
 if(!term||startOfDate(term.renewsOn,run.time_zone)<=await currentTime(env.DB))return false
 const owner=await recipient(env,row)
 return Boolean(owner&&await noticeChannelAllowed(env,row,owner,mail))
}
export async function queueRenewalNotices(env:Bindings){
 const db=env.DB,at=await currentTime(db),zone=await installationZone(db),rows=(await db.prepare(select).all<any>()).results
 for(const row of rows){
  const owner=await recipient(env,row);if(!owner)continue
  for(const term of renewalTerms(row.snapshot)){
   const date=addDays(term.termEnd,-row.lead_days),deadline=startOfDate(term.renewsOn,zone)
   if(startOfDate(date,zone)>at||deadline<=at)continue
   const id='renewal:'+row.id+':'+row.revision+':'+term.renewsOn
   if(await db.prepare('SELECT 1 FROM p_sender_notice_runs WHERE id=?').bind(id).first())continue
   const body='An accepted agreement term ends on '+term.termEnd+' ('+zone+'). Review renewal by '+date+'. No renewal is sent automatically.\n'+env.AUTH_ORIGIN+'/app/proposal?id='+encodeURIComponent(row.id)+'#renewal-review'
   const deliveries=await noticeWrites(env,row,owner,id,'Agreement renewal approaching',body,at)
   if(!deliveries.length)continue
   try{await commit(db,owner,[
    db.prepare("INSERT INTO p_sender_notice_runs(id,proposal_id,revision,deadline_at,notice_date,owner_id,settings_version,occurred_at,kind,term_end,time_zone) VALUES(?,?,?,?,?,?,?,?,'renewal',?,?)").bind(id,row.id,row.revision,deadline,date,owner.id,row.settings_version,at,term.termEnd,zone),
    ...deliveries,
    db.prepare('INSERT INTO p_renewal_followups(proposal_id,term_end,renews_on,due_date,action,actor_id,updated_at) VALUES(?,?,?,?,?,?,?) ON CONFLICT DO NOTHING').bind(row.id,term.termEnd,term.renewsOn,date,'Review renewal proposal',owner.id,at),
    db.prepare("INSERT INTO p_followup_actions(id,proposal_id,revision,kind,action,due_date,actor_id,occurred_at) VALUES(?,?,?,'scheduled',?,?,?,?)").bind(crypto.randomUUID(),row.id,row.revision,'Review renewal proposal',date,owner.id,at)
   ],false,{sql:`EXISTS(SELECT 1 FROM p_proposals p JOIN p_acceptances x ON x.proposal_id=p.id JOIN p_renewal_notice_settings s ON s.proposal_id=p.id ${join} WHERE ${consentCurrent} AND p.id=? AND p.version=? AND p.status='accepted' AND p.sales_owner_id=? AND x.snapshot=? AND s.enabled=1 AND s.version=? AND c.id=?)`,values:[row.id,row.proposal_version,owner.id,row.snapshot,row.settings_version,row.consent_id]})}catch(error){if((error as any).status!==409)throw error}
  }
 }
}
export async function renewalFollowupCommand(env:Bindings,a:Actor,p:Record<string,unknown>){
 const row=await permitted(env.DB,a,p.id,'send');need(senders.includes(a.role),'Only current senders resolve renewal follow-ups',403)
 const followup=await env.DB.prepare('SELECT * FROM p_renewal_followups WHERE proposal_id=? AND term_end=? AND closed_at IS NULL').bind(row.id,String(p.termEnd)).first<any>()
 need(followup,'This renewal follow-up is closed or unavailable',409)
 const resolution=text(p.resolution,'the renewal review outcome',1000),at=await currentTime(env.DB)
 await commit(env.DB,a,[env.DB.prepare('UPDATE p_renewal_followups SET closed_at=?,resolution=?,actor_id=?,updated_at=? WHERE proposal_id=? AND term_end=?').bind(at,resolution,a.id,at,row.id,followup.term_end),env.DB.prepare("INSERT INTO p_followup_actions(id,proposal_id,revision,kind,action,due_date,actor_id,occurred_at) VALUES(?,?,?,'completed',?,?,?,?)").bind(crypto.randomUUID(),row.id,row.revision,resolution,followup.due_date,a.id,at)],false,{sql:'EXISTS(SELECT 1 FROM p_renewal_followups WHERE proposal_id=? AND term_end=? AND closed_at IS NULL)',values:[row.id,followup.term_end]})
 return {id:row.id}
}
export async function renewalNoticeState(env:Bindings,a:Actor,ids:Set<unknown>){
 if(!senders.includes(a.role))return {}
 const db=env.DB,settings=(await db.prepare('SELECT * FROM p_renewal_notice_settings').all<any>()).results.filter(r=>ids.has(r.proposal_id))
 const events=(await db.prepare("SELECT * FROM p_sender_notice_events WHERE kind='renewal' ORDER BY occurred_at,id").all<any>()).results.filter(r=>ids.has(r.proposal_id))
 const grants=(await db.prepare(`SELECT p.id,c.id AS consent_id,p.sales_owner_id FROM p_proposals p JOIN p_renewal_notice_settings s ON s.proposal_id=p.id ${join} WHERE ${consentCurrent} AND s.enabled=1`).all<any>()).results
 const active=[]
 for(const row of grants.filter(r=>ids.has(r.id)))if(await recipient(env,row))active.push(row.id)
 const terms=(await db.prepare('SELECT proposal_id,snapshot FROM p_acceptances').all<any>()).results.filter(r=>ids.has(r.proposal_id)).flatMap(r=>renewalTerms(r.snapshot).map(term=>({proposal_id:r.proposal_id,...term})))
 const followups=(await db.prepare('SELECT * FROM p_renewal_followups ORDER BY due_date,proposal_id,term_end').all<any>()).results.filter(r=>ids.has(r.proposal_id))
 return {renewalNotices:{settings,events,active,terms,followups}}
}
