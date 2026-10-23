// Adapted from Lanyard's revocable owner-bound agent credentials.
import { operatorAuth,type Bindings } from '../auth.server'
import { fail,need,text,hash,secret,commit,type Actor } from './model'
export async function principal(request:Request,env:Bindings,agent=false):Promise<Actor>{
 if(agent){const token=request.headers.get('authorization')?.match(/^Bearer (\S+)$/)?.[1];need(token&&token.length<200,'Agent credential required',401);const k=await env.DB.prepare(`SELECT k.*,o.email FROM p_agent_keys k JOIN oa_operators o ON o.id=k.owner_id WHERE NOT EXISTS(SELECT 1 FROM p_api_key_scopes s WHERE s.key_id=k.id) AND token_hash=? AND revoked_at IS NULL AND expires_at>? AND o.role='owner' AND o.status='active' AND o.version=k.owner_version`).bind(await hash(token),Date.now()).first<any>();need(k,'Agent credential expired or revoked',401);need(!k.paused_at,'Agent is paused',423);return{id:k.owner_id,email:k.email,role:'agent',keyId:k.id}}
 const session=await operatorAuth(env).getSession(request);need(session,'Sign in to continue',401);const o=session.operator;need(!await env.DB.prepare("SELECT email FROM p_member_invitations WHERE email=? AND status='pending'").bind(o.email).first(),'Finish a valid team invitation before accessing proposals',403);need(['owner','member','admin'].includes(o.role),'This role cannot access proposals',403);const member=await env.DB.prepare('SELECT role,version FROM p_members WHERE operator_id=?').bind(o.id).first<any>();return{id:o.id,email:o.email,role:o.role==='owner'?'owner':o.role==='admin'?'admin':member?.role??'sales',memberVersion:member?.version??0}
}
export async function agentKeys(db:D1Database,a:Actor){return a.role==='owner'?(await db.prepare('SELECT id,label,created_at AS createdAt,expires_at AS expiresAt,revoked_at AS revokedAt,paused_at AS pausedAt FROM p_agent_keys WHERE NOT EXISTS(SELECT 1 FROM p_api_key_scopes s WHERE s.key_id=p_agent_keys.id) AND owner_id=? ORDER BY created_at DESC').bind(a.id).all()).results:[]}
export async function credentialCommand(db:D1Database,a:Actor,name:string,p:Record<string,unknown>){need(a.role==='owner','Only the owner manages agent access',403)
 if(name==='agent.discovery-consent'){need(typeof p.enabled==='boolean','Confirm whether this key may retain discovery sources');const id=text(p.id,'agent key');need(await db.prepare('SELECT id FROM p_agent_keys WHERE id=? AND owner_id=? AND revoked_at IS NULL').bind(id,a.id).first(),'Active agent key not found',404);await commit(db,a,[db.prepare('UPDATE p_agent_keys SET discovery_consent_at=? WHERE id=? AND owner_id=? AND revoked_at IS NULL').bind(p.enabled?Date.now():null,id,a.id)],true);return{id,enabled:p.enabled}}
 if(name==='agent.pause'){need(typeof p.paused==='boolean','Choose whether the agent is paused');const id=text(p.id,'agent key');need(await db.prepare('SELECT id FROM p_agent_keys WHERE id=? AND owner_id=? AND revoked_at IS NULL').bind(id,a.id).first(),'Active agent key not found',404);await commit(db,a,[db.prepare('UPDATE p_agent_keys SET paused_at=? WHERE id=? AND owner_id=? AND revoked_at IS NULL').bind(p.paused?Date.now():null,id,a.id)],true);return{id,paused:p.paused}}
 if(name==='agent.create'){const id=crypto.randomUUID(),token='platter_'+secret(),at=Date.now(),expiresAt=at+30*86400000;await commit(db,a,[db.prepare(`INSERT INTO p_agent_keys(id,owner_id,owner_version,label,token_hash,created_at,expires_at) SELECT ?,id,version,?,?,?,? FROM oa_operators WHERE id=? AND role='owner' AND status='active'`).bind(id,text(p.label,'a label',80),await hash(token),at,expiresAt,a.id)],true);return{id,token,expiresAt}}
 if(name==='agent.revoke'){await commit(db,a,[db.prepare('UPDATE p_agent_keys SET revoked_at=? WHERE id=? AND owner_id=?').bind(Date.now(),text(p.id,'agent key'),a.id)],true);return{revoked:true}}
 fail('Unknown access command',404)
}

/** Resolve current product authority for retained scheduled business actions. */
export async function actorById(db:D1Database,id:string):Promise<Actor|undefined>{
 const row=await db.prepare("SELECT o.id,o.email,CASE WHEN o.role IN ('owner','admin') THEN o.role ELSE COALESCE(m.role,'sales') END AS role,COALESCE(m.version,0) AS memberVersion FROM oa_operators o LEFT JOIN p_members m ON m.operator_id=o.id WHERE o.id=? AND o.status='active'").bind(id).first<Actor>()
 return row??undefined
}

export const apiScopes = ['templates.read', 'proposals.read', 'proposals.write', 'agreements.read'] as const
export async function apiCredentialCommand(db:D1Database,a:Actor,name:string,p:Record<string,unknown>){
 need(a.role==='owner','Only the owner manages scoped API access',403)
 if(name==='api.key.list')return {keys:(await db.prepare(`SELECT k.id,k.label,k.created_at AS createdAt,k.expires_at AS expiresAt,k.revoked_at AS revokedAt,k.paused_at AS pausedAt,s.scopes FROM p_agent_keys k JOIN p_api_key_scopes s ON s.key_id=k.id WHERE k.owner_id=? ORDER BY k.created_at,k.id`).bind(a.id).all<any>()).results.map(k=>({...k,scopes:JSON.parse(k.scopes)}))}
 if(name==='api.key.create'){
  need(Array.isArray(p.scopes)&&p.scopes.length>0&&p.scopes.length<=apiScopes.length&&p.scopes.every(s=>apiScopes.includes(s))&&new Set(p.scopes).size===p.scopes.length,'Choose distinct supported scopes')
  const id=crypto.randomUUID(),token='platter_'+secret(),at=Date.now(),expiresAt=at+30*86400000
  await commit(db,a,[db.prepare(`INSERT INTO p_agent_keys(id,owner_id,owner_version,label,token_hash,created_at,expires_at) SELECT ?,id,version,?,?,?,? FROM oa_operators WHERE id=? AND role='owner' AND status='active'`).bind(id,text(p.label,'a label',80),await hash(token),at,expiresAt,a.id),db.prepare('INSERT INTO p_api_key_scopes(key_id,scopes) VALUES(?,?)').bind(id,JSON.stringify(p.scopes))],true)
  return {id,token,expiresAt,scopes:p.scopes}
 }
 if(name==='api.key.revoke'){
  const id=text(p.id,'an API key')
  need(await db.prepare('SELECT key_id FROM p_api_key_scopes WHERE key_id=?').bind(id).first(),'API key not found',404)
  await commit(db,a,[db.prepare('UPDATE p_agent_keys SET revoked_at=COALESCE(revoked_at,?) WHERE id=? AND owner_id=?').bind(Date.now(),id,a.id)],true)
  return {id,revoked:true}
 }
 fail('Unknown API access command',404)
}
export async function apiPrincipal(request:Request,env:Bindings,scope:string):Promise<Actor>{
 const token=request.headers.get('authorization')?.match(/^Bearer (\S+)$/)?.[1]
 need(token&&token.length<200,'Scoped API credential required',401)
 const k=await env.DB.prepare(`SELECT k.id,k.owner_id,k.paused_at,o.email,s.scopes FROM p_agent_keys k JOIN p_api_key_scopes s ON s.key_id=k.id JOIN oa_operators o ON o.id=k.owner_id WHERE k.token_hash=? AND k.revoked_at IS NULL AND k.expires_at>? AND o.role='owner' AND o.status='active' AND o.version=k.owner_version`).bind(await hash(token),Date.now()).first<any>()
 need(k,'API credential expired or revoked',401)
 need(!k.paused_at,'Agent is paused',423)
 need(JSON.parse(k.scopes).includes(scope),'API key lacks the required scope: '+scope,403)
 // The existing transaction guard rechecks the owner and credential on writes.
 // Machine drafts retain agent attribution and mandatory human approval.
 return {id:k.owner_id,email:k.email,role:'agent',keyId:k.id}
}
