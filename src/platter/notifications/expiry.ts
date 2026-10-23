import type { Bindings } from '../../auth.server'
import { actorById } from '../credentials'
import { addDays, currentTime, localDate, startOfDate } from '../expiry-time'
import { commit, exact, need, type Actor } from '../model'
import { administrators, permitted, senders } from '../permissions'
import { notificationWrite } from './dispatch'

function days(value:unknown){const n=Number(value);need(value!==''&&Number.isInteger(n)&&n>=1&&n<=365,'Choose notice lead days from 1 to 365');return n}
function enabled(value:unknown){need([true,false,'yes','no'].includes(value as any),'Choose whether the notice is enabled');return value===true||value==='yes'?1:0}
export async function senderNoticeCommand(env:Bindings,a:Actor,name:string,p:Record<string,unknown>){
 const db=env.DB
 if(name==='notification.defaults'){
  need(administrators.includes(a.role),'Only owner and admins change workspace notice defaults',403)
  const old=await db.prepare('SELECT * FROM p_sender_notice_defaults WHERE singleton=1').first<any>()
  need(Number(p.version)===old.version,'Notice defaults changed. Reload.',409)
  await commit(db,a,[db.prepare('UPDATE p_sender_notice_defaults SET enabled=?,lead_days=?,renewal_enabled=?,renewal_days=?,version=version+1 WHERE singleton=1').bind(enabled(p.enabled),days(p.leadDays),enabled(p.renewalEnabled),days(p.renewalDays))],false,{sql:'EXISTS(SELECT 1 FROM p_sender_notice_defaults WHERE version=?)',values:[old.version]})
  return {saved:true}
 }
 const row=await permitted(db,a,p.id,'send');need(senders.includes(a.role),'Only proposal senders configure notices',403);exact(row,p)
 const defaults=await db.prepare('SELECT * FROM p_sender_notice_defaults WHERE singleton=1').first<any>()
 need(p.consent===true||p.consent==='yes','Explicitly authorize notices to the recorded sales owner')
 const on=p.enabled===undefined?defaults.enabled:enabled(p.enabled),lead=p.leadDays===undefined?defaults.lead_days:days(p.leadDays)
 await commit(db,a,[db.prepare('INSERT INTO p_sender_notice_settings(proposal_id,enabled,lead_days) VALUES(?,?,?) ON CONFLICT(proposal_id) DO UPDATE SET enabled=excluded.enabled,lead_days=excluded.lead_days,version=p_sender_notice_settings.version+1').bind(row.id,on,lead),db.prepare('INSERT INTO p_sender_notice_authority(proposal_id) VALUES(?) ON CONFLICT DO NOTHING').bind(row.id),db.prepare('UPDATE p_proposals SET version=version+1 WHERE id=?').bind(row.id)],false,{sql:'EXISTS(SELECT 1 FROM p_proposals WHERE id=? AND version=?)',values:[row.id,row.version]})
 return {id:row.id,enabled:Boolean(on),leadDays:lead,version:row.version+1}
}
export async function activeExpiryNotice(env:Bindings,mail:any){
 const r=await env.DB.prepare(`SELECT n.*,p.sales_owner_id,p.status,e.deadline_at AS current_deadline,s.version,s.enabled,o.email
 FROM p_sender_notice_runs n JOIN p_proposals p ON p.id=n.proposal_id JOIN p_expiry e ON e.proposal_id=p.id
 JOIN p_sender_notice_settings s ON s.proposal_id=p.id JOIN p_sender_notice_authority a ON a.proposal_id=p.id
 JOIN oa_operators o ON o.id=p.sales_owner_id AND o.status='active'
 WHERE n.id=? AND p.revision=n.revision AND NOT EXISTS(SELECT 1 FROM p_withdrawals w WHERE w.proposal_id=p.id AND w.revision=p.revision)
 AND NOT EXISTS(SELECT 1 FROM p_acceptances x WHERE x.proposal_id=p.id)`).bind(mail.event_key).first<any>()
 if(!r||r.status!=='sent'||!r.enabled||r.version!==r.settings_version||r.current_deadline!==r.deadline_at||r.deadline_at<=await currentTime(env.DB)||r.owner_id!==r.sales_owner_id||r.email!==mail.recipient)return false
 const owner=await actorById(env.DB,r.owner_id);if(!owner||!senders.includes(owner.role))return false
 try{await permitted(env.DB,owner,r.proposal_id,'send');return true}catch{return false}
}
export async function queueExpiryNotices(env:Bindings){
 const db=env.DB,at=await currentTime(db),rows=(await db.prepare(`SELECT p.id,p.version,p.revision,p.sales_owner_id,e.deadline_at,e.expires_on,e.time_zone,s.lead_days,s.version AS settings_version
 FROM p_proposals p JOIN p_expiry e ON e.proposal_id=p.id JOIN p_sender_notice_settings s ON s.proposal_id=p.id JOIN p_sender_notice_authority a ON a.proposal_id=p.id
 WHERE p.status='sent' AND s.enabled=1 AND e.deadline_at>? AND NOT EXISTS(SELECT 1 FROM p_acceptances x WHERE x.proposal_id=p.id)
 AND NOT EXISTS(SELECT 1 FROM p_withdrawals w WHERE w.proposal_id=p.id AND w.revision=p.revision)`).bind(at).all<any>()).results
 for(const row of rows){
  const date=addDays(row.expires_on,-row.lead_days);if(startOfDate(date,row.time_zone)>at)continue
  const owner=await actorById(db,row.sales_owner_id);if(!owner||!senders.includes(owner.role))continue
  try{await permitted(db,owner,row.id,'send')}catch{continue}
  const id='expiry:'+row.id+':'+row.revision+':'+row.deadline_at
  if(await db.prepare('SELECT id FROM p_sender_notice_runs WHERE id=?').bind(id).first())continue
  const body='This unaccepted proposal expires on '+row.expires_on+' ('+row.time_zone+'). Follow up by '+date+'.\n'+env.AUTH_ORIGIN+'/app/proposal?id='+encodeURIComponent(row.id)
  try{await commit(db,owner,[db.prepare('INSERT INTO p_sender_notice_runs(id,proposal_id,revision,deadline_at,notice_date,owner_id,settings_version,occurred_at) VALUES(?,?,?,?,?,?,?,?)').bind(id,row.id,row.revision,row.deadline_at,date,owner.id,row.settings_version,at),notificationWrite(env,id,row.id,'Proposal expiry approaching',body,at,owner.email),db.prepare("INSERT INTO p_followups(proposal_id,revision,action,due_date,actor_id,updated_at) VALUES(?,?,?,?,?,?) ON CONFLICT(proposal_id) DO UPDATE SET revision=excluded.revision,action=excluded.action,due_date=excluded.due_date,closed_at=NULL,resolution=NULL,actor_id=excluded.actor_id,updated_at=excluded.updated_at WHERE p_followups.closed_at IS NOT NULL OR p_followups.revision!=excluded.revision").bind(row.id,row.revision,'Review approaching expiry',date,owner.id,at),db.prepare("INSERT INTO p_followup_actions(id,proposal_id,revision,kind,action,due_date,actor_id,occurred_at) VALUES(?,?,?,'scheduled',?,?,?,?)").bind(crypto.randomUUID(),row.id,row.revision,'Review approaching expiry',date,owner.id,at)],false,{sql:"EXISTS(SELECT 1 FROM p_proposals p JOIN p_expiry e ON e.proposal_id=p.id JOIN p_sender_notice_settings s ON s.proposal_id=p.id JOIN p_sender_notice_authority a ON a.proposal_id=p.id WHERE p.id=? AND p.version=? AND p.status='sent' AND p.sales_owner_id=? AND e.deadline_at=? AND e.deadline_at>? AND s.enabled=1 AND s.version=?) AND NOT EXISTS(SELECT 1 FROM p_acceptances WHERE proposal_id=?) AND NOT EXISTS(SELECT 1 FROM p_withdrawals WHERE proposal_id=? AND revision=?)",values:[row.id,row.version,owner.id,row.deadline_at,at,row.settings_version,row.id,row.id,row.revision]})}catch(error){if((error as any).status!==409)throw error}
 }
}
