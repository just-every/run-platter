// Adapted from Lanyard's revocable owner-bound agent credentials.
import { operatorAuth,type Bindings } from '../auth.server'
import { fail,need,text,hash,secret,commit,type Actor } from './model'
export async function principal(request:Request,env:Bindings,agent=false,rest=false,allowPaused=false):Promise<Actor>{
 if(agent){const token=request.headers.get('authorization')?.match(/^Bearer (\S+)$/)?.[1];need(token&&token.length<200,'Agent credential required',401);const k=await env.DB.prepare(`SELECT k.*,o.email FROM p_agent_keys k JOIN oa_operators o ON o.id=k.owner_id WHERE token_hash=? AND revoked_at IS NULL AND expires_at>? AND o.role='owner' AND o.status='active' AND o.version=k.owner_version`).bind(await hash(token),Date.now()).first<any>();need(k,'Agent credential expired or revoked',401);need(allowPaused||k.paused_at===null,'This agent key is paused',403);need(allowPaused||k.monthly_model_budget_cents===null,'Requests are held by the monthly model budget',409);need(rest||!await env.DB.prepare('SELECT 1 FROM p_rest_keys WHERE key_id=?').bind(k.id).first(),'Use the scoped public API for this key',403);return{id:k.owner_id,email:k.email,role:'agent',keyId:k.id,agentVersion:k.control_version}}
 const session=await operatorAuth(env).getSession(request);need(session,'Sign in to continue',401);const o=session.operator;need(!await env.DB.prepare("SELECT email FROM p_member_invitations WHERE email=? AND status='pending'").bind(o.email).first(),'Finish a valid team invitation before accessing proposals',403);need(['owner','member','admin'].includes(o.role),'This role cannot access proposals',403);const member=await env.DB.prepare('SELECT role,version FROM p_members WHERE operator_id=?').bind(o.id).first<any>();return{id:o.id,email:o.email,role:o.role==='owner'?'owner':o.role==='admin'?'admin':member?.role??'sales',memberVersion:member?.version??0}
}
export async function agentKeys(db:D1Database,a:Actor){return a.role==='owner'?(await db.prepare('SELECT id,label,created_at AS createdAt,expires_at AS expiresAt,revoked_at AS revokedAt,paused_at AS pausedAt,ledger_consent_at AS ledgerConsentAt,control_version AS controlVersion,monthly_model_budget_cents AS monthlyModelBudgetCents FROM p_agent_keys WHERE owner_id=? ORDER BY created_at DESC').bind(a.id).all()).results:[]}
export async function credentialCommand(db:D1Database,a:Actor,name:string,p:Record<string,unknown>){need(a.role==='owner','Only the owner manages agent access',403)
 if(name==='agent.create'){const id=crypto.randomUUID(),token='platter_'+secret(),at=Date.now(),expiresAt=at+30*86400000;await commit(db,a,[db.prepare(`INSERT INTO p_agent_keys(id,owner_id,owner_version,label,token_hash,created_at,expires_at) SELECT ?,id,version,?,?,?,? FROM oa_operators WHERE id=? AND role='owner' AND status='active'`).bind(id,text(p.label,'a label',80),await hash(token),at,expiresAt,a.id)],true);return{id,token,expiresAt}}
 if(name==='agent.pause'||name==='agent.resume'||name==='agent.receipts'||name==='agent.budget'){
  const id=text(p.id,'agent key'),key=await db.prepare('SELECT id,control_version FROM p_agent_keys WHERE id=? AND owner_id=? AND revoked_at IS NULL').bind(id,a.id).first<any>();need(key,'Active agent key not found',404)
  need(Number(p.version)===key.control_version,'Agent controls changed. Reload.',409)
  if(name==='agent.budget'){
   need(typeof p.budget==='string'||typeof p.budget==='number','Enter a monthly model budget, or leave it empty')
   const written=String(p.budget).trim()
   need(written===''||/^\d{1,8}(\.\d{1,2})?$/.test(written),'Enter a USD budget with at most two decimal places')
   const cents=written===''?null:Math.round(Number(written)*100)
   need(cents===null||Number.isSafeInteger(cents)&&cents<=1000000000,'Budget must be from $0 to $10,000,000')
   need(cents===null||p.consent===true||p.consent==='yes','Confirm that unmetered requests will be held')
   await commit(db,a,[db.prepare('UPDATE p_agent_keys SET monthly_model_budget_cents=?,control_version=control_version+1 WHERE id=? AND owner_id=?').bind(cents,id,a.id)],true,{sql:'EXISTS(SELECT 1 FROM p_agent_keys WHERE id=? AND owner_id=? AND control_version=? AND revoked_at IS NULL)',values:[id,a.id,key.control_version]})
   return{id}
  }
  if(name==='agent.receipts')need([true,false,'yes','no'].includes(p.consent as any),'Choose explicit receipt consent')
  const column=name==='agent.receipts'?'ledger_consent_at':'paused_at',value=name==='agent.pause'||(name==='agent.receipts'&&(p.consent===true||p.consent==='yes'))?Date.now():null
  await commit(db,a,[db.prepare(`UPDATE p_agent_keys SET ${column}=?,control_version=control_version+1 WHERE id=? AND owner_id=?`).bind(value,id,a.id)],true,{sql:'EXISTS(SELECT 1 FROM p_agent_keys WHERE id=? AND owner_id=? AND control_version=? AND revoked_at IS NULL)',values:[id,a.id,key.control_version]});return{id}
 }
 if(name==='agent.revoke'){await commit(db,a,[db.prepare('UPDATE p_agent_keys SET revoked_at=? WHERE id=? AND owner_id=?').bind(Date.now(),text(p.id,'agent key'),a.id)],true);return{revoked:true}}
 fail('Unknown access command',404)
}

/** Resolve current product authority for retained scheduled business actions. */
export async function actorById(db:D1Database,id:string):Promise<Actor|undefined>{
 const row=await db.prepare("SELECT o.id,o.email,CASE WHEN o.role IN ('owner','admin') THEN o.role ELSE COALESCE(m.role,'sales') END AS role,COALESCE(m.version,0) AS memberVersion FROM oa_operators o LEFT JOIN p_members m ON m.operator_id=o.id WHERE o.id=? AND o.status='active'").bind(id).first<Actor>()
 return row??undefined
}
