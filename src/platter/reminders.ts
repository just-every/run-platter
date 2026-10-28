import { recipientPlan } from './recipients'
import { reminderMessageSnapshot } from './reminder-message-defaults'
import { reminderCopy, scheduledReminderCopy } from './reminder-messages'
import type { Bindings } from '../auth.server'
import { actorById } from './credentials'
import { commit, exact, hash, need, text, type Actor } from './model'
import { administrators, permitted, senders } from './permissions'
import { currentTime, localDate } from './expiry-time'
import { expiryFor, expiryOpenSql } from './expiry'
import { validZone } from './reports/zone'
import { reminderSlots, reminderQuiet } from './reminder-schedule'
export { reminderQuiet } from './reminder-schedule'
import { dispatchMail, queueMail } from './mail'
import { deliveryChange } from './delivery-settings'

export async function reminderPolicy(db:D1Database){return await db.prepare('SELECT * FROM p_reminder_policy WHERE singleton=1').first<any>()??{quiet_start:20,quiet_end:8,version:0}}
const audit=(db:D1Database,a:Actor,action:string,id:string,at:number)=>db.prepare('INSERT INTO p_audit(id,actor_id,actor_role,action,subject,occurred_at) VALUES(?,?,?,?,?,?)').bind(crypto.randomUUID(),a.id,a.role,action,id,at)
function days(value:unknown,fallback:number[]){
 const result=value===undefined?fallback:typeof value==='string'?value.trim()?value.split(',').map(v=>Number(v.trim())):[]:value
 need(Array.isArray(result)&&result.length<=20&&result.every(d=>Number.isInteger(d)&&d>=1&&d<=365)&&new Set(result).size===result.length,'Choose distinct reminder days from 1 to 365')
 return result.toSorted((a:number,b:number)=>a-b)
}
export async function reminderState(db:D1Database,a:Actor){
 const settings=(await db.prepare('SELECT s.*,EXISTS(SELECT 1 FROM p_reminder_authority a WHERE a.proposal_id=s.proposal_id AND a.revision=s.revision AND a.settings_version=s.version) AS authorized FROM p_reminder_settings s').all<any>()).results
 return {policy:await reminderPolicy(db),settings,runs:(await db.prepare("SELECT r.*,CASE WHEN m.held_reason='sender_not_authorized' THEN 'withheld' ELSE m.status END AS transport_status FROM p_reminder_runs r LEFT JOIN p_reminder_transport t ON t.run_id=r.id LEFT JOIN p_mail m ON m.id=t.mail_id ORDER BY r.queued_at,r.id").all<any>()).results,optouts:(await db.prepare('SELECT * FROM p_reminder_optouts').all<any>()).results}
}
export async function reminderCommand(env:Bindings,a:Actor,name:string,p:Record<string,unknown>){
 const db=env.DB,at=await currentTime(db)
 if(name==='reminder.policy'){
  need(administrators.includes(a.role),'Only owner and admins change reminder quiet hours',403)
  const old=await reminderPolicy(db),start=Number(p.quietStart),end=Number(p.quietEnd)
  need(Number(p.version)===old.version,'Reminder policy changed. Reload.',409)
  need(Number.isInteger(start)&&Number.isInteger(end)&&start>=0&&start<=23&&end>=0&&end<=23&&start!==end,'Choose distinct quiet-hour start and end hours from 0 to 23')
  await commit(db,a,[db.prepare('INSERT INTO p_reminder_policy(singleton,quiet_start,quiet_end) VALUES(1,?,?) ON CONFLICT(singleton) DO UPDATE SET quiet_start=excluded.quiet_start,quiet_end=excluded.quiet_end,version=p_reminder_policy.version+1').bind(start,end)],true,{sql:'COALESCE((SELECT version FROM p_reminder_policy WHERE singleton=1),0)=?',values:[old.version]})
  return {id:'installation'}
 }
 const row=await permitted(db,a,p.id,'send');need(!recipientPlan(row).length,'Multiple-recipient reminders are not enabled. Expiry warnings remain available.',409);need(senders.includes(a.role),'Your role cannot send reminders',403)
 const old=await db.prepare('SELECT * FROM p_reminder_settings WHERE proposal_id=?').bind(row.id).first<any>()
 if(name==='reminder.configure'){
  exact(row,p);need(['draft','approved','sent'].includes(row.status),'Only open proposals can have reminders',409)
  const enabled=p.loadTemplate==='yes'?false:p.enabled===true||p.enabled==='yes';need([true,false,'yes','no'].includes(p.enabled as any),'Choose whether reminders are enabled')
  need(!enabled||p.consent===true||p.consent==='yes','Explicitly authorize scheduled reminder email')
  const zone=text(p.timeZone,'the recipient IANA time zone',100);need(validZone(zone),'Choose the recipient IANA time zone')
  const defaults=await db.prepare('SELECT settings FROM p_proposal_defaults WHERE proposal_id=?').bind(row.id).first<any>(),base=defaults?JSON.parse(defaults.settings):{reminderDays:[2,5,9],beforeExpiryDays:[3],reminderCap:3}
  const cap=Number(p.cap??base.reminderCap);need(Number.isInteger(cap)&&cap>=0&&cap<=365,'Choose a reminder cap from 0 to 365')
  const copy=await reminderCopy(db,a,row,p,old),settings={afterDays:days(p.afterDays,base.reminderDays),beforeDays:days(p.beforeDays,base.beforeExpiryDays),cap,...(copy.messageTemplate?{messageTemplate:copy.messageTemplate}:{})}
  const client=await db.prepare('SELECT email FROM p_clients WHERE id=?').bind(row.client_id).first<any>(),share=await db.prepare('SELECT recipient FROM p_shares WHERE proposal_id=?').bind(row.id).first<any>(),recipient=share?.recipient??client.email,version=(old?.version??0)+1
  await commit(db,a,[db.prepare('INSERT INTO p_reminder_settings(proposal_id,revision,sender_id,recipient,time_zone,enabled,settings,subject,message) VALUES(?,?,?,?,?,?,?,?,?) ON CONFLICT(proposal_id) DO UPDATE SET revision=excluded.revision,sender_id=excluded.sender_id,recipient=excluded.recipient,time_zone=excluded.time_zone,enabled=excluded.enabled,settings=excluded.settings,subject=excluded.subject,message=excluded.message,version=p_reminder_settings.version+1').bind(row.id,row.revision,a.id,recipient,zone,enabled?1:0,JSON.stringify(settings),copy.subject,copy.message),db.prepare('INSERT INTO p_proposal_defaults(proposal_id,settings) VALUES(?,?) ON CONFLICT(proposal_id) DO UPDATE SET settings=excluded.settings').bind(row.id,JSON.stringify({...base,remindersEnabled:enabled,reminderDays:settings.afterDays,beforeExpiryDays:settings.beforeDays,reminderCap:cap,reminderTemplateId:copy.messageTemplate?.id??null,reminderMessageTemplate:reminderMessageSnapshot(copy.messageTemplate),reminderSubject:copy.messageTemplate?.subject??copy.subject,reminderMessage:copy.messageTemplate?.message??copy.message})),deliveryChange(db,a,row,'reminder.configure',{enabled,timeZone:zone,...settings,...copy,consent:enabled},at),db.prepare('DELETE FROM p_reminder_authority WHERE proposal_id=?').bind(row.id),...(enabled?[db.prepare('INSERT INTO p_reminder_authority(proposal_id,revision,settings_version) VALUES(?,?,?)').bind(row.id,row.revision,version)]:[]),db.prepare('UPDATE p_proposals SET version=version+1 WHERE id=?').bind(row.id)],true,{sql:"EXISTS(SELECT 1 FROM p_proposals WHERE id=? AND version=? AND revision=? AND status IN ('draft','approved','sent')) AND COALESCE((SELECT version FROM p_reminder_settings WHERE proposal_id=?),0)=?",values:[row.id,row.version,row.revision,row.id,old?.version??0]})
  return {id:row.id,version:row.version+1}
 }
 need(name==='reminder.send','Unknown reminder action',404)
 need(old&&old.revision===row.revision,'Configure the recipient time zone before sending reminders',409)
 const zone=old.time_zone;need(p.timeZone===undefined||p.timeZone===zone,'Use the configured recipient time zone')
 const copy=await reminderCopy(db,a,row,p,old),requestId=text(p.requestId,'a reminder request id',100)
 const prior=await db.prepare('SELECT * FROM p_reminder_runs WHERE request_id=?').bind(requestId).first<any>()
 if(prior){need(prior.proposal_id===row.id&&prior.actor_id===a.id&&prior.kind==='manual'&&prior.subject===copy.subject&&prior.message===copy.message&&prior.time_zone===zone,'This reminder request id was already used',409);return {id:row.id,reminderId:prior.id,replayed:true}}
 return queueReminder(env,a,row,{...copy,zone,kind:'manual',slot:localDate(at,zone),requestId,at,settingsVersion:old.version})
}
async function queueReminder(env:Bindings,a:Actor,row:any,input:{subject:string;message:string;zone:string;kind:string;slot:string;requestId:string;at:number;settingsVersion?:number;cap?:number}){
 const db=env.DB,{at,kind,slot}=input
 need(!recipientPlan(row).length,'Multiple-recipient reminders are not enabled',409)
 need(row.status==='sent'&&!(await expiryFor(db,row,at)).expired,'Only an unsigned open proposal can be reminded',409)
 const share=await db.prepare('SELECT s.*,c.email FROM p_shares s JOIN p_proposals p ON p.id=s.proposal_id JOIN p_clients c ON c.id=p.client_id WHERE s.proposal_id=? AND s.revision=?').bind(row.id,row.revision).first<any>();need(share,'Send a current invitation first',409)
 const recipient=share.recipient??share.email
 need(!await db.prepare('SELECT 1 FROM p_reminder_optouts WHERE proposal_id=? AND revision=? AND recipient=?').bind(row.id,row.revision,recipient).first(),'The recipient opted out of reminders',409)
 const prior=kind==='manual'?(await db.prepare("SELECT queued_at FROM p_reminder_runs WHERE proposal_id=? AND recipient=? AND kind='manual' AND queued_at>?").bind(row.id,recipient,at-2*86400000).all<any>()).results.some(r=>localDate(r.queued_at,input.zone)===localDate(at,input.zone)):await db.prepare('SELECT id FROM p_reminder_runs WHERE proposal_id=? AND revision=? AND recipient=? AND kind=? AND slot=?').bind(row.id,row.revision,recipient,kind,slot).first<any>()
 need(!prior,kind==='manual'?'One manual reminder per recipient calendar day is allowed':'This reminder slot was already claimed',kind==='manual'?429:409)
 const id=crypto.randomUUID(),mailId=crypto.randomUUID(),shareHash=await hash(share.token)
 const sql="EXISTS(SELECT 1 FROM p_proposals p JOIN p_shares s ON s.proposal_id=p.id WHERE p.id=? AND p.revision=? AND p.status='sent' AND s.revision=p.revision AND s.token=? AND "+expiryOpenSql('p')+" AND NOT EXISTS(SELECT 1 FROM p_withdrawals w WHERE w.proposal_id=p.id AND w.revision=p.revision) AND NOT EXISTS(SELECT 1 FROM p_acceptances WHERE proposal_id=p.id)) AND NOT EXISTS(SELECT 1 FROM p_reminder_optouts WHERE proposal_id=? AND revision=? AND recipient=?)"
 const values:any[]=[row.id,row.revision,share.token,at,row.id,row.revision,recipient]
 let scheduled=' AND EXISTS(SELECT 1 FROM p_reminder_settings WHERE proposal_id=? AND revision=? AND version=? AND time_zone=? AND recipient=?)'
 values.push(row.id,row.revision,input.settingsVersion,input.zone,recipient)
 if(kind==='scheduled'){
  scheduled+=" AND EXISTS(SELECT 1 FROM p_reminder_settings s JOIN p_reminder_authority a ON a.proposal_id=s.proposal_id AND a.revision=s.revision AND a.settings_version=s.version WHERE s.proposal_id=? AND s.revision=? AND s.sender_id=? AND s.recipient=? AND s.enabled=1 AND s.version=?) AND (SELECT count(*) FROM p_reminder_runs WHERE proposal_id=? AND revision=? AND recipient=? AND kind='scheduled')<?"
  values.push(row.id,row.revision,a.id,recipient,input.settingsVersion,row.id,row.revision,recipient,input.cap)
 }
 try{await commit(db,a,[db.prepare('INSERT INTO p_reminder_runs(id,proposal_id,revision,recipient,kind,slot,local_date,time_zone,actor_id,subject,message,queued_at,request_id) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)').bind(id,row.id,row.revision,recipient,kind,slot,localDate(at,input.zone),input.zone,a.id,input.subject,input.message,at,input.requestId),db.prepare('INSERT INTO p_reminder_transport(mail_id,run_id,share_hash,settings_version) VALUES(?,?,?,?)').bind(mailId,id,shareHash,input.settingsVersion??null),queueMail(env,row.id,recipient,input.subject,input.message+'\n\n'+env.AUTH_ORIGIN+'/p/'+share.token+'\n\nTo stop reminders, verify your mailbox on the proposal and opt out.',a.id,null,mailId),audit(db,a,'reminder.'+kind,row.id,at)],true,{sql:sql+scheduled,values})}catch(error){
  if(kind==='manual'&&(error as any).status===409&&await db.prepare("SELECT 1 FROM p_reminder_runs WHERE proposal_id=? AND recipient=? AND kind='manual' AND local_date=?").bind(row.id,recipient,slot).first())need(false,'One manual reminder per recipient calendar day is allowed',429)
  throw error
 }
 await dispatchMail(env,row.id,mailId)
 return {id:row.id,reminderId:id}
}
/** Called only by the exported Worker cron, after the monotone clock has advanced. */
export async function runReminders(env:Bindings,at:number){
 need(Number.isSafeInteger(at)&&at>=0,'Invalid cron trigger time')
 const db=env.DB,now=await currentTime(db),policy=await reminderPolicy(db)
 const due=(await db.prepare("SELECT s.*,e.sent_at,e.expires_on,e.deadline_at FROM p_reminder_settings s JOIN p_reminder_authority a ON a.proposal_id=s.proposal_id AND a.revision=s.revision AND a.settings_version=s.version JOIN p_proposals p ON p.id=s.proposal_id AND p.revision=s.revision JOIN p_expiry e ON e.proposal_id=p.id WHERE s.enabled=1 AND p.status='sent' AND e.sent_at IS NOT NULL").all<any>()).results
 for(const s of due){
  if(reminderQuiet(now,s.time_zone,policy))continue
  const actor=await actorById(db,s.sender_id);if(!actor||!senders.includes(actor.role))continue
  let row:any;try{row=await permitted(db,actor,s.proposal_id,'send')}catch{continue}
  const settings=JSON.parse(s.settings),slots=reminderSlots(settings,s.sent_at,s.time_zone,{date:s.expires_on,deadlineAt:s.deadline_at},policy)
  for(const slot of slots.filter(slot=>slot.at<=now).sort((a,b)=>a.at-b.at)){
   try{const copy=await scheduledReminderCopy(db,actor,row,s);await queueReminder(env,actor,row,{...copy,zone:s.time_zone,kind:'scheduled',slot:slot.id,requestId:crypto.randomUUID(),at:now,settingsVersion:s.version,cap:settings.cap})}catch(error){if([400,403,409,429].includes((error as any).status))continue;throw error}
   break
  }
 }
}
