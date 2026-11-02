import type { Bindings } from '../../auth.server'
import { archiveAuthoritySql } from '../archiving/jobs'
import { commit, need, text, type Actor } from '../model'
import { administrators } from '../permissions'

// Both referenced grants and the rule author must still be current.
export const liveRules=`SELECT r.* FROM p_automation_rules r
 JOIN p_automation_authority g ON g.rule_id=r.id
 JOIN oa_operators o ON o.id=r.authorized_by AND o.status='active' AND o.version=r.operator_version
 LEFT JOIN p_members m ON m.operator_id=o.id
 JOIN p_notification_routes n ON n.id=r.route_id AND n.event='signed' AND n.provider='slack' AND n.kind='channel'
 JOIN p_notification_route_authority ng ON ng.route_id=n.id
 JOIN p_connections c ON c.id='workspace:slack' AND c.status='connected' AND c.broken_at IS NULL AND c.version=n.connection_version
 JOIN p_connection_secrets secret ON secret.connection_id=c.id
 WHERE COALESCE(m.version,0)=r.member_version
 AND (o.role IN ('owner','admin') OR (o.role='member' AND m.role='admin'))
 AND EXISTS(SELECT 1 FROM (${archiveAuthoritySql}) s WHERE s.version=r.archive_version)`

/** Part of the acceptance transaction: no polling or historical backfill. */
export function automationCompletion(env:Bindings,id:string){
 const db=env.DB
 return [
  db.prepare(`INSERT INTO p_automation_runs(id,rule_id,proposal_id,revision,created_at)
   SELECT r.id||':'||a.proposal_id||':'||a.revision,r.id,a.proposal_id,a.revision,a.accepted_at
   FROM (${liveRules}) r JOIN p_archive_jobs a ON a.proposal_id=? AND a.settings_version=r.archive_version WHERE true
   ON CONFLICT DO NOTHING`).bind(id),
  db.prepare('INSERT INTO p_automation_run_authority SELECT id FROM p_automation_runs WHERE proposal_id=? ON CONFLICT DO NOTHING').bind(id),
  db.prepare(`INSERT INTO p_notification_outbox(id,event_key,proposal_id,subject,body,created_at,route_id,status)
   SELECT lower(hex(randomblob(16))),'signed:'||a.proposal_id,a.proposal_id,'Proposal signed',?||'/app/proposal?id='||a.proposal_id,a.created_at,r.route_id,'pending'
   FROM p_automation_runs a JOIN p_automation_rules r ON r.id=a.rule_id
   WHERE a.proposal_id=? ON CONFLICT DO NOTHING`).bind(env.AUTH_ORIGIN,id),
  db.prepare(`INSERT INTO p_automation_steps(run_id,kind,child_id,status)
   SELECT id,'archive',proposal_id,'queued' FROM p_automation_runs WHERE proposal_id=? ON CONFLICT DO NOTHING`).bind(id),
  db.prepare(`INSERT INTO p_automation_steps(run_id,kind,child_id,status)
   SELECT a.id,'notification',n.id,'queued' FROM p_automation_runs a JOIN p_automation_rules r ON r.id=a.rule_id
   JOIN p_notification_outbox n ON n.event_key='signed:'||a.proposal_id AND n.route_id=r.route_id
   WHERE a.proposal_id=? ON CONFLICT DO NOTHING`).bind(id),
 ]
}

export async function childAuthorized(env:Bindings,kind:string,id:string){
 const db=env.DB
 const linked=await db.prepare('SELECT 1 FROM p_automation_steps WHERE kind=? AND child_id=?').bind(kind,id).first()
 if(!linked)return true
 return Boolean(await db.prepare(`SELECT 1 FROM p_automation_steps s JOIN p_automation_runs a ON a.id=s.run_id
 JOIN p_automation_run_authority g ON g.run_id=a.id JOIN (${liveRules}) r ON r.id=a.rule_id
 JOIN p_acceptances accepted ON accepted.proposal_id=a.proposal_id AND accepted.revision=a.revision
 JOIN p_proposals p ON p.id=a.proposal_id AND p.status='accepted' JOIN p_clients client ON client.id=p.client_id
 WHERE s.kind=? AND s.child_id=?`).bind(kind,id).first())
}
export async function ruleCommand(env:Bindings,a:Actor,name:string,p:Record<string,unknown>){
 need(administrators.includes(a.role),'Only owner and admins authorize automation rules',403)
 const db=env.DB
 if(name==='automation.revoke'){
  const id=text(p.id,'an automation rule')
  need(await db.prepare('SELECT 1 FROM p_automation_rules WHERE id=?').bind(id).first(),'Rule not found',404)
  await commit(db,a,[db.prepare('DELETE FROM p_automation_authority WHERE rule_id=?').bind(id)])
  return {id}
 }
 need(name==='automation.configure','Unknown automation action',404)
 need(p.consent===true||p.consent==='yes','Explicitly authorize this signed-event rule')
 need(p.trigger==='signed','Only the signed trigger is supported')
 const label=text(p.name,'a rule name',120),routeId=text(p.routeId,'an authorized Slack channel route')
 const archive=await db.prepare(archiveAuthoritySql).first<any>()
 need(archive&&archive.version===Number(p.archiveVersion),'Review the currently authorized Drive destination',409)
 const operator=await db.prepare('SELECT version FROM oa_operators WHERE id=?').bind(a.id).first<any>(),id=crypto.randomUUID()
 const writes=[db.prepare('INSERT INTO p_automation_rules VALUES(?,?,?,?,?,?,?,?)').bind(id,label,archive.version,routeId,a.id,operator.version,a.memberVersion??0,Date.now()),db.prepare('INSERT INTO p_automation_authority VALUES(?)').bind(id)]
 await commit(db,a,writes,false,{sql:`EXISTS(SELECT 1 FROM (${archiveAuthoritySql}) s WHERE s.version=?) AND EXISTS(
 SELECT 1 FROM p_notification_routes n JOIN p_notification_route_authority g ON g.route_id=n.id
 JOIN p_connections c ON c.id='workspace:slack' AND c.status='connected' AND c.broken_at IS NULL AND c.version=n.connection_version
 JOIN p_connection_secrets secret ON secret.connection_id=c.id
 WHERE n.id=? AND n.event='signed' AND n.provider='slack' AND n.kind='channel')`,values:[archive.version,routeId]})
 return {id}
}
