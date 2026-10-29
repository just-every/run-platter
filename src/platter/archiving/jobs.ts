import type { Bindings } from '../../auth.server'
import { agreementArtifact } from '../documents/agreement'
import { markConnectionBroken, providerCredential } from '../connections'
import { commit, need, text, type Actor } from '../model'
import { administrators } from '../permissions'
import { recordAudit } from '../audit'
import { checkDrivePdf, createDriveFolder, driveFolder, driveId, sha256, uploadDrivePdf, type DriveAuthority } from './google-drive'

const live=`SELECT s.*,o.email,o.role AS native_role,COALESCE(m.role,'sales') AS member_role,COALESCE(m.version,0) AS member_version
 FROM p_archive_settings s JOIN p_archive_authority g ON g.singleton=s.singleton AND g.version=s.version
 JOIN oa_operators o ON o.id=s.authorized_by AND o.status='active' AND o.version=g.operator_version
 LEFT JOIN p_members m ON m.operator_id=o.id
 JOIN p_connections c ON c.id='workspace:google_drive' AND c.status='connected' AND c.broken_at IS NULL AND c.version=s.connection_version AND c.account_id=s.account_id
 JOIN p_connection_secrets secret ON secret.connection_id=c.id
 WHERE s.singleton=1 AND COALESCE(m.version,0)=g.member_version
 AND (o.role IN ('owner','admin') OR (o.role='member' AND m.role='admin'))`
const clean=(value:string)=>value.replace(/[\x00-\x1f\x7f/\\]/g,'-').trim().slice(0,120)||'Agreement'
export function archiveName(job:any){return clean(job.pattern.replace(/\{(client|title|date|revision)\}/g,(_:string,key:string)=>({client:job.client_name,title:job.title,date:new Date(job.accepted_at).toISOString().slice(0,10),revision:String(job.revision)})[key]!))}

/** Called inside the signature transaction, never by scanning restored acceptances. */
export function archiveCompletion(db:D1Database,id:string){return [
 db.prepare(`INSERT INTO p_archive_jobs(proposal_id,revision,settings_version,account_id,root_folder,pattern,client_id,client_name,title,accepted_at,status)
 SELECT a.proposal_id,a.revision,s.version,s.account_id,s.root_folder,s.pattern,p.client_id,COALESCE(json_extract(a.snapshot,'$.clientName'),c.name),json_extract(a.snapshot,'$.title'),a.accepted_at,'queued'
 FROM p_acceptances a JOIN p_proposals p ON p.id=a.proposal_id JOIN p_clients c ON c.id=p.client_id
 JOIN p_signature_facts f ON f.proposal_id=a.proposal_id AND f.revision=a.revision
 CROSS JOIN p_archive_settings s WHERE a.proposal_id=? AND f.method='mailbox code'
 AND json_array_length(COALESCE(json_extract(a.snapshot,'$.recipient_plan'),'[]'))=0
 AND COALESCE(json_extract(a.snapshot,'$.collectionPolicy.enabled'),0)=0
 AND EXISTS(SELECT 1 FROM (${live}) eligible WHERE eligible.version=s.version)
 ON CONFLICT DO NOTHING`).bind(id),
 db.prepare('INSERT INTO p_archive_job_authority SELECT proposal_id FROM p_archive_jobs WHERE proposal_id=? ON CONFLICT DO NOTHING').bind(id)
]}
export async function archiveState(env:Bindings,a:Actor){
 if(!administrators.includes(a.role))return undefined
 const settings=await env.DB.prepare('SELECT * FROM p_archive_settings WHERE singleton=1').first<any>()
 return {settings:settings?{...settings,active:Boolean(await env.DB.prepare(live).first())}:null,jobs:(await env.DB.prepare('SELECT j.*,EXISTS(SELECT 1 FROM p_archive_job_authority g WHERE g.proposal_id=j.proposal_id) AS executable FROM p_archive_jobs j ORDER BY accepted_at DESC LIMIT 100').all<any>()).results}
}
export async function archiveCommand(env:Bindings,a:Actor,name:string,p:Record<string,unknown>){
 need(administrators.includes(a.role),'Only owner and admins authorize document archiving',403)
 const db=env.DB,old=await db.prepare('SELECT * FROM p_archive_settings WHERE singleton=1').first<any>()
 if(name==='archive.configure'){
  need(Number(p.version)===(old?.version??0),'Archive configuration changed. Reload.',409)
  need(p.consent===true||p.consent==='yes','Explicitly authorize the Drive account, destination and naming pattern')
  const {connection}=await providerCredential(env,'workspace:google_drive')
  need(p.accountId===connection.account_id&&Number(p.connectionVersion)===connection.version,'Review the current verified Drive account',409)
  const root=text(p.folderId,'a Drive destination folder id',200);need(/^[A-Za-z0-9_-]+$/.test(root),'Use a Drive folder id')
  const pattern=text(p.pattern,'a naming pattern',120),unknown=pattern.replace(/\{(client|title|date|revision)\}/g,'')
  need(!/[{}\x00-\x1f\x7f/\\]/.test(unknown),'Use client, title, date and revision placeholders without path separators')
  const operator=await db.prepare('SELECT version FROM oa_operators WHERE id=?').bind(a.id).first<any>(),version=(old?.version??0)+1
  const guard={sql:"COALESCE((SELECT version FROM p_archive_settings WHERE singleton=1),0)=? AND EXISTS(SELECT 1 FROM p_connections WHERE id='workspace:google_drive' AND version=? AND account_id=? AND status='connected')",values:[old?.version??0,connection.version,connection.account_id]}
  // Validate the chosen folder using the same current connection that will be granted.
  await driveFolder(async()=>{await commit(db,a,[],false,guard);const current=await providerCredential(env,'workspace:google_drive');need(current.connection.version===connection.version,'Connection changed',409);return driveAccess(env,current)},root)
  await commit(db,a,[db.prepare('INSERT INTO p_archive_settings VALUES(1,?,?,?,?,?,?,?) ON CONFLICT(singleton) DO UPDATE SET version=excluded.version,account_id=excluded.account_id,connection_version=excluded.connection_version,root_folder=excluded.root_folder,pattern=excluded.pattern,authorized_by=excluded.authorized_by,authorized_at=excluded.authorized_at').bind(version,connection.account_id,connection.version,root,pattern,a.id,Date.now()),db.prepare('INSERT INTO p_archive_authority VALUES(1,?,?,?) ON CONFLICT(singleton) DO UPDATE SET version=excluded.version,operator_version=excluded.operator_version,member_version=excluded.member_version').bind(version,operator.version,a.memberVersion??0)],false,guard)
  return {version}
 }
 if(name==='archive.revoke'){
  need(old&&Number(p.version)===old.version,'Archive configuration changed. Reload.',409)
  await commit(db,a,[db.prepare('DELETE FROM p_archive_authority')]);return {revoked:true}
 }
 if(name==='archive.dispatch'){await commit(db,a,[]);await runArchives(env);return {saved:true}}
 need(name==='archive.reconcile','Unknown archive action',404)
 await commit(db,a,[]);await reconcileArchive(env,text(p.id,'an archive job'));await recordAudit(db,a,'archive.reconciled',String(p.id));return {saved:true}
}
function driveAccess(env:Bindings,credential:Awaited<ReturnType<typeof providerCredential>>){
 const {id,version,sealed}=credential.connection
 return {token:credential.secret.token,credentialRejected:()=>markConnectionBroken(env,id,version,sealed)}
}
async function execution(env:Bindings,job:any){
 const config=await env.DB.prepare(live).first<any>()
 need(config&&config.version===job.settings_version&&config.account_id===job.account_id&&config.root_folder===job.root_folder,'Archive authorization or connection changed; fresh configuration applies only to future completions',409)
 need(await env.DB.prepare("SELECT 1 FROM p_archive_job_authority g JOIN p_acceptances a ON a.proposal_id=g.proposal_id JOIN p_proposals p ON p.id=a.proposal_id JOIN p_clients c ON c.id=p.client_id WHERE g.proposal_id=? AND a.revision=? AND p.status='accepted'").bind(job.proposal_id,job.revision).first(),'This job has no current completion authority; restored history never executes',409)
 const credential=await providerCredential(env,'workspace:google_drive')
 need(credential.connection.version===config.connection_version&&credential.connection.account_id===job.account_id,'Drive connection changed',409)
 return {...driveAccess(env,credential),actor:{id:config.authorized_by,email:config.email,role:config.native_role==='owner'?'owner':'admin',memberVersion:config.member_version} as Actor}
}
async function folderFor(env:Bindings,job:any,authorize:DriveAuthority,reconcile=false){
 const db=env.DB,key=[job.account_id,job.root_folder,job.client_id],where='account_id=? AND root_folder=? AND client_id=?'
 let folder=await db.prepare('SELECT * FROM p_archive_folders WHERE '+where).bind(...key).first<any>()
 if(!folder){
  need(!reconcile,'No reserved client folder to reconcile',409)
  const id=await driveId(authorize)
  await db.prepare("INSERT INTO p_archive_folders VALUES(?,?,?,?,?,'reserved') ON CONFLICT DO NOTHING").bind(...key,id,clean(job.client_name)+' - '+job.client_id).run()
  folder=await db.prepare('SELECT * FROM p_archive_folders WHERE '+where).bind(...key).first<any>()
 }
 if(folder.status==='reserved'&&!reconcile){
  const claimed=await db.prepare("UPDATE p_archive_folders SET status='writing' WHERE "+where+" AND status='reserved' RETURNING provider_id").bind(...key).first()
  need(claimed,'Client folder creation is in progress; reconcile before continuing',409)
  try{await createDriveFolder(authorize,folder.provider_id,job.root_folder,folder.name,job.client_id);await db.prepare("UPDATE p_archive_folders SET status='complete' WHERE "+where).bind(...key).run()}
  catch(error){await db.prepare("UPDATE p_archive_folders SET status='uncertain' WHERE "+where).bind(...key).run();throw error}
 }else{
  need(reconcile||folder.status==='complete','Client folder creation is uncertain; reconcile before continuing',409)
  const found=await driveFolder(authorize,folder.provider_id)
  need(found.parents?.includes(job.root_folder)&&found.appProperties?.platterClient===job.client_id,'The client folder no longer matches this destination',409)
  if(reconcile)await db.prepare("UPDATE p_archive_folders SET status='complete' WHERE "+where).bind(...key).run()
 }
 return folder.provider_id as string
}
async function processArchive(env:Bindings,job:any,reconcile=false){
 const db=env.DB,authorize=async()=>await execution(env,job)
 const {actor}=await execution(env,job)
 // Both consumers use the same immutable artifact row and never render a second PDF.
 await agreementArtifact(env,job.proposal_id,'certificate.json',{actor})
 const artifacts=await db.prepare('SELECT * FROM p_agreement_artifacts WHERE proposal_id=? AND revision=?').bind(job.proposal_id,job.revision).first<any>();need(artifacts,'Retained agreement artifacts are unavailable',409)
 await driveFolder(authorize,job.root_folder)
 const folder=await folderFor(env,job,authorize,reconcile)
 for(const kind of ['agreement','certificate']){
  let file=await db.prepare('SELECT * FROM p_archive_files WHERE proposal_id=? AND kind=?').bind(job.proposal_id,kind).first<any>()
  if(reconcile){need(file,'This archive has unwritten files; reconciliation never creates or retries uploads',409);await checkDrivePdf(authorize,file);await db.prepare("UPDATE p_archive_files SET status='complete' WHERE proposal_id=? AND kind=?").bind(job.proposal_id,kind).run();continue}
  if(file?.status==='complete')continue
  need(!file,'This file already has a reserved write; reconcile before continuing',409)
  const bytes=new Uint8Array(kind==='agreement'?artifacts.document:artifacts.certificate),digest=await sha256(bytes),id=await driveId(authorize),name=archiveName(job)+' - '+kind+'.pdf'
  await db.prepare("INSERT INTO p_archive_files VALUES(?,?,?,?,?,?,'writing')").bind(job.proposal_id,kind,id,folder,name,digest).run()
  try{await uploadDrivePdf(authorize,id,folder,name,bytes,digest);await db.prepare("UPDATE p_archive_files SET status='complete' WHERE proposal_id=? AND kind=?").bind(job.proposal_id,kind).run()}
  catch(error){await db.prepare("UPDATE p_archive_files SET status='uncertain' WHERE proposal_id=? AND kind=?").bind(job.proposal_id,kind).run();throw error}
 }
 await execution(env,job)
 await db.prepare("UPDATE p_archive_jobs SET status='complete',reason=NULL,completed_at=? WHERE proposal_id=?").bind(Date.now(),job.proposal_id).run()
}
async function held(env:Bindings,job:any,error:unknown){
 const reason=error instanceof Error&&('status' in error)?error.message:'Drive outcome is uncertain. Reconcile the reserved files; no automatic upload retry.'
 await env.DB.prepare("UPDATE p_archive_jobs SET status='held',reason=? WHERE proposal_id=?").bind(reason,job.proposal_id).run()
}
export async function runArchives(env:Bindings){
 const db=env.DB,token=crypto.randomUUID(),now=Date.now()
 const lock=await db.prepare('INSERT INTO p_archive_dispatch_lock VALUES(1,?,?) ON CONFLICT(singleton) DO UPDATE SET token=excluded.token,expires_at=excluded.expires_at WHERE expires_at<? RETURNING token').bind(token,now+900000,now).first()
 if(!lock)return
 try{
 await db.prepare("UPDATE p_archive_jobs SET status='held',reason='Interrupted archive. Reconcile the reserved files; no automatic upload retry.' WHERE status IN ('running','reconciling') AND started_at<?").bind(Date.now()-900000).run()
 const jobs=(await db.prepare("SELECT j.* FROM p_archive_jobs j JOIN p_archive_job_authority g ON g.proposal_id=j.proposal_id WHERE j.status='queued' ORDER BY j.accepted_at LIMIT 10").all<any>()).results
 for(const job of jobs){
  const lease=await db.prepare('UPDATE p_archive_dispatch_lock SET expires_at=? WHERE singleton=1 AND token=? RETURNING token').bind(Date.now()+900000,token).first();if(!lease)return
  const claimed=await db.prepare("UPDATE p_archive_jobs SET status='running',started_at=? WHERE proposal_id=? AND status='queued' RETURNING proposal_id").bind(Date.now(),job.proposal_id).first();if(!claimed)continue
  try{await processArchive(env,job)}catch(error){await held(env,job,error)}
 }
 }finally{await db.prepare('DELETE FROM p_archive_dispatch_lock WHERE singleton=1 AND token=?').bind(token).run()}
}
async function reconcileArchive(env:Bindings,id:string){
 const job=await env.DB.prepare("UPDATE p_archive_jobs SET status='reconciling',started_at=? WHERE proposal_id=? AND status='held' RETURNING *").bind(Date.now(),id).first<any>()
 need(job,'Choose a held archive job',409)
 try{await processArchive(env,job,true)}catch(error){await held(env,job,error);throw error}
}
