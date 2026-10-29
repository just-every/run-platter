import type { Bindings } from '../../auth.server'
import { actorById } from '../credentials'
import { addDays, calendarDate, currentTime, startOfDate } from '../expiry-time'
import { commit } from '../model'
import { permitted, senders } from '../permissions'
import { notificationWrite } from './dispatch'
import { consentCurrent, consentJoin, currentSender } from './expiry'

/** Only immutable accepted recurring terms establish an end date; legacy prose does not. */
export function renewalDates(snapshot:string):string[]{
 const fees=JSON.parse(snapshot).selection?.fees?.recurring??[]
 return [...new Set<string>(fees.flatMap((fee:any)=>{
  if(!fee.renewalOn)return []
  try{return [addDays(calendarDate(fee.renewalOn),-1)]}catch{return []}
 }))].sort()
}

export async function activeRenewalNotice(env:Bindings,mail:any){
 const db=env.DB,r=await db.prepare(`SELECT n.*,p.status,p.sales_owner_id,s.renewal_enabled,s.version,c.id AS consent_id,o.email,x.snapshot,e.time_zone
 FROM p_sender_notice_runs n JOIN p_proposals p ON p.id=n.proposal_id
 JOIN p_acceptances x ON x.proposal_id=p.id AND x.revision=p.revision
 JOIN p_expiry e ON e.proposal_id=p.id JOIN p_sender_notice_settings s ON s.proposal_id=p.id ${consentJoin}
 JOIN oa_operators o ON o.id=p.sales_owner_id AND o.status='active'
 WHERE n.id=? AND n.kind='renewal' AND p.revision=n.revision AND ${consentCurrent}
 AND NOT EXISTS(SELECT 1 FROM p_withdrawals w WHERE w.proposal_id=p.id AND w.revision=p.revision)`).bind(mail.event_key).first<any>()
 if(!r||r.status!=='accepted'||!r.renewal_enabled||r.version!==r.settings_version||r.owner_id!==r.sales_owner_id||r.email!==mail.recipient)return false
 if(!renewalDates(r.snapshot).some(date=>startOfDate(date,r.time_zone)===r.deadline_at)||r.deadline_at<await currentTime(db))return false
 const owner=await actorById(db,r.owner_id);if(!owner||!senders.includes(owner.role))return false
 try{await permitted(db,owner,r.proposal_id,'send');return await currentSender(db,r.consent_id,r.proposal_id)}catch{return false}
}

export async function queueRenewalNotices(env:Bindings){
 const db=env.DB,at=await currentTime(db),rows=(await db.prepare(`SELECT p.id,p.version,p.revision,p.sales_owner_id,e.time_zone,x.snapshot,s.renewal_days,s.version AS settings_version,c.id AS consent_id
 FROM p_proposals p JOIN p_acceptances x ON x.proposal_id=p.id AND x.revision=p.revision
 JOIN p_expiry e ON e.proposal_id=p.id JOIN p_sender_notice_settings s ON s.proposal_id=p.id ${consentJoin}
 WHERE ${consentCurrent} AND p.status='accepted' AND s.renewal_enabled=1
 AND NOT EXISTS(SELECT 1 FROM p_withdrawals w WHERE w.proposal_id=p.id AND w.revision=p.revision)`).all<any>()).results
 for(const row of rows){
  const owner=await actorById(db,row.sales_owner_id)
  if(!owner||!senders.includes(owner.role)||!await currentSender(db,row.consent_id,row.id))continue
  try{await permitted(db,owner,row.id,'send')}catch{continue}
  for(const end of renewalDates(row.snapshot)){
   const date=addDays(end,-row.renewal_days),deadline=startOfDate(end,row.time_zone)
   if(startOfDate(date,row.time_zone)>at||deadline<at)continue
   const id='renewal:'+row.id+':'+row.revision+':'+end
   if(await db.prepare('SELECT id FROM p_sender_notice_runs WHERE id=?').bind(id).first())continue
   const action='Review renewal offer',body='This accepted term ends on '+end+' ('+row.time_zone+'). Review a renewal offer. Follow up by '+date+'.\n'+env.AUTH_ORIGIN+'/app/proposal?id='+encodeURIComponent(row.id)+'#renewal-offer'
   try{await commit(db,owner,[
    db.prepare("INSERT INTO p_sender_notice_runs(id,proposal_id,revision,deadline_at,notice_date,owner_id,settings_version,occurred_at,kind) VALUES(?,?,?,?,?,?,?,?,'renewal')").bind(id,row.id,row.revision,deadline,date,owner.id,row.settings_version,at),
    notificationWrite(env,id,row.id,'Agreement renewal approaching',body,at,owner.email),
    db.prepare('INSERT INTO p_followups(proposal_id,revision,action,due_date,actor_id,updated_at) VALUES(?,?,?,?,?,?) ON CONFLICT(proposal_id) DO UPDATE SET revision=excluded.revision,action=excluded.action,due_date=excluded.due_date,closed_at=NULL,resolution=NULL,actor_id=excluded.actor_id,updated_at=excluded.updated_at WHERE p_followups.closed_at IS NOT NULL OR p_followups.revision!=excluded.revision').bind(row.id,row.revision,action,date,owner.id,at),
    db.prepare("INSERT INTO p_followup_actions(id,proposal_id,revision,kind,action,due_date,actor_id,occurred_at) VALUES(?,?,?,'scheduled',?,?,?,?)").bind(crypto.randomUUID(),row.id,row.revision,action,date,owner.id,at)
   ],false,{sql:`EXISTS(SELECT 1 FROM p_proposals p JOIN p_acceptances x ON x.proposal_id=p.id AND x.revision=p.revision JOIN p_sender_notice_settings s ON s.proposal_id=p.id ${consentJoin} WHERE ${consentCurrent} AND p.id=? AND p.version=? AND p.status='accepted' AND p.sales_owner_id=? AND s.renewal_enabled=1 AND s.version=? AND c.id=? AND x.snapshot=?)`,values:[row.id,row.version,owner.id,row.settings_version,row.consent_id,row.snapshot]})}catch(error){if((error as any).status!==409)throw error}
  }
 }
}
