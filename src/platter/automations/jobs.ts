import type { Bindings } from '../../auth.server'
import { commit, need, text, type Actor } from '../model'
import { administrators } from '../permissions'
import { flushNotifications } from '../notifications/dispatch'
import { runArchives } from '../archiving/jobs'
import { childAuthorized, liveRules, ruleCommand } from './rules'

export async function refreshAutomationSteps(env:Bindings){
 const db=env.DB,steps=(await db.prepare('SELECT s.* FROM p_automation_steps s JOIN p_automation_run_authority g ON g.run_id=s.run_id').all<any>()).results
 for(const s of steps){
  let status='held',reason:string|null=null
  if(s.kind==='archive'){
   const j=await db.prepare('SELECT * FROM p_archive_jobs WHERE proposal_id=?').bind(s.child_id).first<any>()
   if(j){status=({complete:'success',queued:'queued',running:'running',reconciling:'running',held:'held'} as any)[j.status];reason=j.reason
    if(j.status==='held'&&await db.prepare("SELECT 1 FROM p_archive_files WHERE proposal_id=? AND status IN ('writing','uncertain') UNION ALL SELECT 1 FROM p_archive_folders f JOIN p_archive_jobs j ON j.client_id=f.client_id AND j.account_id=f.account_id AND j.root_folder=f.root_folder WHERE j.proposal_id=? AND f.status IN ('writing','uncertain')").bind(s.child_id,s.child_id).first())status='uncertain'
   }
  }else{
   const row=await db.prepare('SELECT * FROM p_notification_outbox WHERE id=?').bind(s.child_id).first<any>()
   const attempt=await db.prepare('SELECT * FROM p_notification_attempts WHERE outbox_id=? ORDER BY started_at DESC,rowid DESC LIMIT 1').bind(s.child_id).first<any>()
   if(row){status=({pending:'queued',sending:'uncertain',sent:'success',local:'local',withheld:attempt?.outcome==='failed'?'failed':'held',uncertain:'uncertain'} as any)[row.status];reason=attempt?.reason??null}
  }
  if(['queued','running'].includes(status)&&!await childAuthorized(env,s.kind,s.child_id)){status='held';reason='Current rule or destination authority is unavailable. Old runs never gain authority from new configuration.'}
  await db.prepare('UPDATE p_automation_steps SET status=?,reason=? WHERE run_id=? AND kind=?').bind(status,reason,s.run_id,s.kind).run()
 }
}
export async function automationState(env:Bindings,a:Actor){
 if(!administrators.includes(a.role))return undefined
 await refreshAutomationSteps(env)
 const db=env.DB
 return {
  rules:(await db.prepare(`SELECT r.*,EXISTS(SELECT 1 FROM (${liveRules}) current WHERE current.id=r.id) AS active FROM p_automation_rules r ORDER BY created_at,id`).all<any>()).results,
  routes:(await db.prepare("SELECT r.id,r.destination FROM p_notification_routes r JOIN p_notification_route_authority g ON g.route_id=r.id WHERE r.event='signed' AND r.provider='slack' AND r.kind='channel'").all<any>()).results,
  runs:(await db.prepare('SELECT r.*,p.title,EXISTS(SELECT 1 FROM p_automation_run_authority g WHERE g.run_id=r.id) AS executable FROM p_automation_runs r JOIN p_proposals p ON p.id=r.proposal_id ORDER BY r.created_at DESC,r.id LIMIT 100').all<any>()).results,
  steps:(await db.prepare('SELECT * FROM p_automation_steps ORDER BY run_id,kind').all<any>()).results,
  attempts:(await db.prepare('SELECT * FROM p_notification_attempts ORDER BY started_at,rowid').all<any>()).results,
 }
}
export async function runAutomations(env:Bindings){await refreshAutomationSteps(env)}
export async function automationCommand(env:Bindings,a:Actor,name:string,p:Record<string,unknown>){
 need(administrators.includes(a.role),'Only owner and admins manage automation runs',403)
 if(['automation.configure','automation.revoke'].includes(name))return ruleCommand(env,a,name,p)
 if(name==='automation.dispatch'){
  await commit(env.DB,a,[]);await runArchives(env);await flushNotifications(env);await refreshAutomationSteps(env);return {saved:true}
 }
 need(name==='automation.retry','Unknown automation action',404)
 const db=env.DB,id=text(p.id,'an automation run')
 const step=await db.prepare("SELECT s.* FROM p_automation_steps s JOIN p_automation_run_authority g ON g.run_id=s.run_id WHERE s.run_id=? AND s.kind='notification'").bind(id).first<any>()
 need(step&&await childAuthorized(env,'notification',step.child_id),'This run has no current execution authority',409)
 need(p.consent===true||p.consent==='yes','Explicitly authorize retrying the rejected Slack message')
 // Compare the last receipt atomically; concurrent retries can claim only once.
 const guard={sql:`EXISTS(SELECT 1 FROM p_notification_outbox n WHERE n.id=? AND n.status='withheld')
 AND (SELECT outcome FROM p_notification_attempts WHERE outbox_id=? ORDER BY started_at DESC,rowid DESC LIMIT 1)='failed'
 AND EXISTS(SELECT 1 FROM p_automation_runs a JOIN p_automation_run_authority g ON g.run_id=a.id JOIN (${liveRules}) r ON r.id=a.rule_id WHERE a.id=?)`,values:[step.child_id,step.child_id,id]}
 await commit(db,a,[db.prepare("UPDATE p_notification_outbox SET status='pending' WHERE id=?").bind(step.child_id),db.prepare("INSERT INTO p_audit(id,actor_id,actor_role,action,subject,occurred_at) VALUES(?,?,?,'automation.retry',?,?)").bind(crypto.randomUUID(),a.id,a.role,id,Date.now())],false,guard)
 await flushNotifications(env);await refreshAutomationSteps(env)
 return {id}
}
