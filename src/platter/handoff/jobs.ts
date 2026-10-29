import type { Bindings } from '../../auth.server'
import { providerCredential } from '../connections'
import { commit, need, type Actor } from '../model'
import { administrators } from '../permissions'
import { asanaCreate, asanaDestination, asanaId } from './asana'

const live=`SELECT s.*,g.completion_scope,o.version AS operator_version,COALESCE(m.version,0) AS member_version
 FROM p_handoff_settings s JOIN p_handoff_authority g ON g.singleton=s.singleton AND g.version=s.version
 JOIN oa_operators o ON o.id=s.authorized_by AND o.status='active' AND o.version=g.operator_version
 LEFT JOIN p_members m ON m.operator_id=o.id
 JOIN p_connections c ON c.id='workspace:asana' AND c.status='connected' AND c.broken_at IS NULL AND c.version=s.connection_version AND c.account_id=s.account_id
 JOIN p_connection_secrets secret ON secret.connection_id=c.id
 WHERE s.singleton=1 AND COALESCE(m.version,0)=g.member_version
 AND (o.role IN ('owner','admin') OR (o.role='member' AND m.role='admin'))`

// Completion uses the immutable collection policy and an authorized, exactly bound receipt.
const complete=`(COALESCE(json_extract(a.snapshot,'$.collectionPolicy.enabled'),0)=0
 OR json_extract(a.snapshot,'$.collectionPolicy.completion')='due' OR a.deposit_cents=0
 OR EXISTS(SELECT 1 FROM p_collection_intents i WHERE i.proposal_id=a.proposal_id AND i.revision=a.revision
 AND i.status='succeeded' AND i.authorized_at IS NOT NULL AND i.deposit_cents=a.deposit_cents AND i.currency=a.currency))`
const agreementPath=(job:any)=>job.file_id?'/api/platter/attachments/'+encodeURIComponent(job.proposal_id)+'/'+encodeURIComponent(job.file_id):'/api/platter/agreement.pdf?id='+encodeURIComponent(job.proposal_id)

/** Enqueued only inside a new supported acceptance transaction; never backfilled. */
export function handoffCompletion(db:D1Database,id:string){return [
 db.prepare(`INSERT INTO p_handoff_jobs(proposal_id,revision,settings_version,account_id,workspace_id,team_id,title,accepted_at,status)
 SELECT a.proposal_id,a.revision,s.version,s.account_id,s.workspace_id,s.team_id,json_extract(a.snapshot,'$.title'),a.accepted_at,'queued'
 FROM p_acceptances a LEFT JOIN p_signature_facts f ON f.proposal_id=a.proposal_id AND f.revision=a.revision
 CROSS JOIN p_handoff_settings s WHERE a.proposal_id=?
 AND ((f.method='mailbox code' AND f.verified_at IS NOT NULL
 AND NOT EXISTS(SELECT 1 FROM p_recipient_signatures r WHERE r.proposal_id=a.proposal_id AND r.revision=a.revision
 AND (r.method!='mailbox code' OR r.verified_at IS NULL)))
 OR EXISTS(SELECT 1 FROM p_paper_acceptances paper WHERE paper.proposal_id=a.proposal_id))
 AND EXISTS(SELECT 1 FROM (${live}) eligible WHERE eligible.version=s.version
 AND (eligible.completion_scope=1 OR (f.method='mailbox code'
 AND json_array_length(COALESCE(json_extract(a.snapshot,'$.recipient_plan'),'[]'))=0
 AND COALESCE(json_extract(a.snapshot,'$.collectionPolicy.enabled'),0)=0)))
 ON CONFLICT DO NOTHING`).bind(id),
 db.prepare('INSERT INTO p_handoff_job_authority SELECT proposal_id FROM p_handoff_jobs WHERE proposal_id=? ON CONFLICT DO NOTHING').bind(id)
]}
export async function handoffState(env:Bindings,a:Actor){
 if(!administrators.includes(a.role))return undefined
 const db=env.DB,settings=await db.prepare('SELECT * FROM p_handoff_settings WHERE singleton=1').first<any>()
 const jobs=(await db.prepare(`SELECT j.*,paper.file_id,NOT ${complete} AS waiting_for_payment,
 EXISTS(SELECT 1 FROM p_handoff_job_authority g WHERE g.proposal_id=j.proposal_id) AS executable
 FROM p_handoff_jobs j JOIN p_acceptances a ON a.proposal_id=j.proposal_id AND a.revision=j.revision
 LEFT JOIN p_paper_acceptances paper ON paper.proposal_id=j.proposal_id ORDER BY j.accepted_at DESC LIMIT 100`).all<any>()).results
 const writes=(await db.prepare('SELECT proposal_id,position,kind,status,provider_id FROM p_handoff_writes ORDER BY proposal_id,position').all<any>()).results
 const authority=await db.prepare(live).first<any>()
 return {settings:settings?{...settings,active:Boolean(authority),expanded:Boolean(authority?.completion_scope)}:null,jobs:jobs.map(j=>({...j,agreementPath:agreementPath(j),writes:writes.filter(w=>w.proposal_id===j.proposal_id)}))}
}
export async function handoffCommand(env:Bindings,a:Actor,name:string,p:Record<string,unknown>){
 need(administrators.includes(a.role),'Only owner and admins authorize delivery handoff',403)
 const db=env.DB,old=await db.prepare('SELECT * FROM p_handoff_settings WHERE singleton=1').first<any>()
 if(name==='handoff.configure'){
  need(Number(p.version)===(old?.version??0),'Handoff configuration changed. Reload.',409)
  need(p.consent===true||p.consent==='yes','Explicitly authorize the verified Asana account, workspace and team')
  const {connection}=await providerCredential(env,'workspace:asana')
  need(p.accountId===connection.account_id&&Number(p.connectionVersion)===connection.version,'Review the current verified Asana account',409)
  const workspace=asanaId(p.workspaceId),team=asanaId(p.teamId),version=(old?.version??0)+1
  const guard={sql:"COALESCE((SELECT version FROM p_handoff_settings WHERE singleton=1),0)=? AND EXISTS(SELECT 1 FROM p_connections WHERE id='workspace:asana' AND version=? AND account_id=? AND status='connected' AND broken_at IS NULL)",values:[old?.version??0,connection.version,connection.account_id]}
  await asanaDestination(async()=>{await commit(db,a,[],false,guard);const current=await providerCredential(env,'workspace:asana');need(current.connection.version===connection.version,'Asana connection changed',409);return current.secret.token},workspace,team)
  const operator=await db.prepare('SELECT version FROM oa_operators WHERE id=?').bind(a.id).first<any>()
  await commit(db,a,[db.prepare('INSERT INTO p_handoff_settings VALUES(1,?,?,?,?,?,?,?) ON CONFLICT(singleton) DO UPDATE SET version=excluded.version,account_id=excluded.account_id,connection_version=excluded.connection_version,workspace_id=excluded.workspace_id,team_id=excluded.team_id,authorized_by=excluded.authorized_by,authorized_at=excluded.authorized_at').bind(version,connection.account_id,connection.version,workspace,team,a.id,Date.now()),db.prepare('INSERT INTO p_handoff_authority(singleton,version,operator_version,member_version,completion_scope) VALUES(1,?,?,?,1) ON CONFLICT(singleton) DO UPDATE SET version=excluded.version,operator_version=excluded.operator_version,member_version=excluded.member_version,completion_scope=excluded.completion_scope').bind(version,operator.version,a.memberVersion??0)],false,guard)
  return {version}
 }
 if(name==='handoff.revoke'){
  need(old&&Number(p.version)===old.version,'Handoff configuration changed. Reload.',409)
  await commit(db,a,[db.prepare('DELETE FROM p_handoff_authority')]);return {revoked:true}
 }
 need(name==='handoff.dispatch','Unknown handoff action',404)
 await commit(db,a,[]);await runHandoffs(env);return {saved:true}
}
async function execution(env:Bindings,job:any){
 const config=await env.DB.prepare(live).first<any>()
 need(config&&config.version===job.settings_version&&config.account_id===job.account_id&&config.workspace_id===job.workspace_id&&config.team_id===job.team_id,'Handoff authority or connection changed. Fresh authorization applies only to future completions.',409)
 need(await env.DB.prepare(`SELECT 1 FROM p_handoff_job_authority g JOIN p_handoff_jobs j ON j.proposal_id=g.proposal_id
 JOIN p_acceptances a ON a.proposal_id=j.proposal_id JOIN p_proposals p ON p.id=a.proposal_id JOIN p_clients c ON c.id=p.client_id
 WHERE j.proposal_id=? AND j.status='running' AND a.revision=? AND p.revision=a.revision AND p.status='accepted' AND ${complete}`).bind(job.proposal_id,job.revision).first(),'This handoff has no current completion authority. Restored history never executes.',409)
 // Keep a progressing handoff live even when a large selected scope takes several minutes.
 need(await env.DB.prepare("UPDATE p_handoff_jobs SET started_at=? WHERE proposal_id=? AND status='running' RETURNING proposal_id").bind(Date.now(),job.proposal_id).first(),'Handoff execution is no longer active',409)
 const credential=await providerCredential(env,'workspace:asana')
 need(credential.connection.version===config.connection_version&&credential.connection.account_id===job.account_id,'Asana connection changed',409)
 return credential.secret.token as string
}
/** Project only the selected immutable public scope, never private pricing metadata. */
function scopeTasks(snapshot:any,optionId:string){
 const option=snapshot.options.find((o:any)=>o.id===optionId);need(option,'Accepted package is unavailable',409)
 const schedule=(snapshot.paymentSchedule?.rows??[]).filter((r:any)=>r.date)
 const dateFor=(name:string)=>{const matches=schedule.filter((r:any)=>r.label===name);return matches.length===1?matches[0].date:undefined}
 const lines=(option.tables??[]).flatMap((table:any)=>table.lines.map((line:any)=>({name:line.name,notes:line.description+'\nQuantity: '+line.quantity+(line.unit?' '+line.unit:''),date:dateFor(line.name)})))
 if(!lines.length)lines.push({name:option.label,notes:snapshot.scope,date:dateFor(option.label)})
 for(const item of snapshot.selection?.items??[])lines.push({name:item.label,notes:'Quantity: '+item.quantity,date:dateFor(item.label)})
 return {lines,schedule}
}
async function processHandoff(env:Bindings,job:any){
 const db=env.DB,authorize=()=>execution(env,job)
 await authorize()
 const accepted=await db.prepare('SELECT a.snapshot,a.option_id,paper.file_id FROM p_acceptances a LEFT JOIN p_paper_acceptances paper ON paper.proposal_id=a.proposal_id WHERE a.proposal_id=? AND a.revision=?').bind(job.proposal_id,job.revision).first<any>();need(accepted,'Accepted scope is unavailable',409)
 const snapshot=JSON.parse(accepted.snapshot),{lines,schedule}=scopeTasks(snapshot,accepted.option_id)
 const link=env.AUTH_ORIGIN+agreementPath({...job,file_id:accepted.file_id})
 const write=async(position:number,kind:'project'|'task',data:any)=>{
  // Save the exact attempted request before I/O. No path retries a reserved write.
  await db.prepare("INSERT INTO p_handoff_writes VALUES(?,?,?,?,'writing',NULL)").bind(job.proposal_id,position,kind,JSON.stringify(data)).run()
  try{
   const id=await asanaCreate(authorize,kind,data)
   await db.prepare("UPDATE p_handoff_writes SET status='complete',provider_id=? WHERE proposal_id=? AND position=?").bind(id,job.proposal_id,position).run()
   return id
  }catch(error){await db.prepare("UPDATE p_handoff_writes SET status='uncertain' WHERE proposal_id=? AND position=?").bind(job.proposal_id,position).run();throw error}
 }
 const project=await write(0,'project',{workspace:job.workspace_id,team:job.team_id,name:snapshot.title,notes:snapshot.scope+'\nAgreement (sign in required): '+link+(schedule.length?'\nRecorded schedule:\n'+schedule.map((r:any)=>r.label+': '+r.date).join('\n'):'')})
 await db.prepare('UPDATE p_handoff_jobs SET project_id=? WHERE proposal_id=?').bind(project,job.proposal_id).run()
 for(const [i,line] of lines.entries())await write(i+1,'task',{projects:[project],name:line.name,notes:line.notes+'\nAgreement (sign in required): '+link,...(line.date?{due_on:line.date}:{})})
 await authorize()
 await db.prepare("UPDATE p_handoff_jobs SET status='complete',reason=NULL,completed_at=? WHERE proposal_id=? AND status='running'").bind(Date.now(),job.proposal_id).run()
}
export async function runHandoffs(env:Bindings){
 const db=env.DB
 await db.prepare("UPDATE p_handoff_jobs SET status='held',reason='Interrupted handoff. Inspect Asana and the retained write history; automatic retry is disabled.' WHERE status='running' AND started_at<?").bind(Date.now()-900000).run()
 const jobs=(await db.prepare(`SELECT j.* FROM p_handoff_jobs j JOIN p_handoff_job_authority g ON g.proposal_id=j.proposal_id
 JOIN p_acceptances a ON a.proposal_id=j.proposal_id AND a.revision=j.revision
 WHERE j.status='queued' AND ${complete} ORDER BY j.accepted_at LIMIT 10`).all<any>()).results
 for(const job of jobs){
  const claimed=await db.prepare("UPDATE p_handoff_jobs SET status='running',started_at=? WHERE proposal_id=? AND status='queued' RETURNING proposal_id").bind(Date.now(),job.proposal_id).first();if(!claimed)continue
  try{await processHandoff(env,job)}catch(error){
   const reason=error instanceof Error&&('status' in error)?error.message:'Asana write outcome is uncertain. Inspect Asana and the retained write history; automatic retry is disabled.'
   await db.prepare("UPDATE p_handoff_jobs SET status='held',reason=? WHERE proposal_id=?").bind(reason,job.proposal_id).run()
  }
 }
}
