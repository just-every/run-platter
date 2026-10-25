import { demoEffect } from '@runeditrun/rer/internal/modules/demo/index.mjs'
import type { Bindings } from '../auth.server'
import { actorById } from './credentials'
import { providerCredential, providerJson } from './connections'
import { currentTime } from './expiry-time'
import { administrators, permitted } from './permissions'
import { commit, exact, need, text, type Actor } from './model'

// Match the retained consent to every part of the bounded stage map.
const consentMatch=`EXISTS(SELECT 1 FROM p_crm_outcome_consents s JOIN p_audit audit ON audit.id=s.audit_id WHERE s.proposal_id=b.proposal_id AND s.binding_version=b.version AND s.revision=b.revision AND s.account_id=b.account_id AND s.connection_version=b.connection_version AND s.deal_id=b.deal_id AND s.pipeline_id=b.pipeline_id AND s.won_stage=b.won_stage AND s.lost_stage=b.lost_stage AND audit.action='outcome.crm.authorize' AND audit.subject=b.proposal_id AND audit.actor_id=b.actor_id)`
const liveBinding=`EXISTS(SELECT 1 FROM p_crm_outcome_authority a JOIN p_proposals p ON p.id=a.proposal_id JOIN p_connections c ON c.id='workspace:hubspot' WHERE a.proposal_id=b.proposal_id AND a.binding_version=b.version AND p.revision=b.revision AND EXISTS(SELECT 1 FROM oa_operators o LEFT JOIN p_members m ON m.operator_id=o.id WHERE o.id=b.actor_id AND o.status='active' AND CASE WHEN o.role IN ('owner','admin') THEN o.role ELSE COALESCE(m.role,'sales') END IN ('owner','admin')) AND NOT EXISTS(SELECT 1 FROM p_negotiations n WHERE n.proposal_id=p.id) AND c.account_id=b.account_id AND c.version=b.connection_version AND c.status='connected' AND c.broken_at IS NULL AND EXISTS(SELECT 1 FROM p_connection_secrets secret WHERE secret.connection_id=c.id)) AND EXISTS(SELECT 1 FROM oa_operators actor LEFT JOIN p_members member ON member.operator_id=actor.id WHERE actor.id=b.actor_id AND actor.status='active' AND CASE WHEN actor.role IN ('owner','admin') THEN actor.role ELSE COALESCE(member.role,'sales') END IN ('owner','admin')) AND ${consentMatch}`

export async function outcomeSettings(db:D1Database){
 const saved=await db.prepare('SELECT version,reasons FROM p_outcome_settings WHERE singleton=1').first<any>()
 return {version:saved?.version??0,reasons:saved?JSON.parse(saved.reasons) as string[]:[]}
}
export async function firmOutcomeReason(db:D1Database,value:unknown){
 const reason=text(value,'an outcome reason',1000),settings=await outcomeSettings(db)
 need(!settings.reasons.length||settings.reasons.includes(reason),'Choose a configured outcome reason')
 return {reason,settingsVersion:settings.version}
}
export async function saveOutcomeSettings(db:D1Database,a:Actor,p:Record<string,unknown>){
 need(administrators.includes(a.role),'Only owner and admins configure outcome reasons',403)
 const current=await outcomeSettings(db);need(Number(p.version)===current.version,'Outcome settings changed. Reload.',409)
 const input=typeof p.reasons==='string'?p.reasons.split('\n'):p.reasons
 need(Array.isArray(input)&&input.length<=30,'Enter at most 30 outcome reasons, one per line')
 const reasons=input.filter(v=>String(v).trim()).map(v=>text(v,'an outcome reason',200))
 need(new Set(reasons.map(v=>v.toLowerCase())).size===reasons.length,'Outcome reasons must be distinct')
 await commit(db,a,[db.prepare('INSERT INTO p_outcome_settings(singleton,version,reasons) VALUES(1,?,?) ON CONFLICT(singleton) DO UPDATE SET version=excluded.version,reasons=excluded.reasons').bind(current.version+1,JSON.stringify(reasons)),db.prepare('INSERT INTO p_audit(id,actor_id,actor_role,action,subject,occurred_at) VALUES(?,?,?,?,?,?)').bind(crypto.randomUUID(),a.id,a.role,'outcome.settings','installation',await currentTime(db))],false,{sql:'COALESCE((SELECT version FROM p_outcome_settings WHERE singleton=1),0)=?',values:[current.version]})
 return {saved:true}
}
export async function crmOutcomeState(db:D1Database,a:Actor){
 if(!administrators.includes(a.role))return undefined
 return {bindings:(await db.prepare(`SELECT b.*,(${liveBinding}) AS authorized FROM p_crm_outcome_bindings b`).all<any>()).results,attempts:(await db.prepare('SELECT * FROM p_crm_outcome_attempts ORDER BY attempted_at').all<any>()).results}
}
const identifier=(value:unknown,label:string)=>{const id=text(value,label,200);need(/^[A-Za-z0-9_-]+$/.test(id),'Use a provider identifier made of letters, numbers, hyphens or underscores');return id}
export async function configureCrmOutcome(env:Bindings,a:Actor,p:Record<string,unknown>){
 need(administrators.includes(a.role),'Only owner and admins authorize CRM outcome synchronization',403)
 const db=env.DB,row=await permitted(db,a,p.id,'send');exact(row,p)
 const old=await db.prepare('SELECT * FROM p_crm_outcome_bindings WHERE proposal_id=?').bind(row.id).first<any>()
 need(Number(p.bindingVersion)===(old?.version??0),'CRM outcome settings changed. Reload.',409)
 const version=(old?.version??0)+1,at=await currentTime(db),guard={sql:'EXISTS(SELECT 1 FROM p_proposals WHERE id=? AND version=? AND revision=?) AND COALESCE((SELECT version FROM p_crm_outcome_bindings WHERE proposal_id=?),0)=?',values:[row.id,row.version,row.revision,row.id,old?.version??0] as any[]}
 const revocations=await db.prepare("SELECT COUNT(*) AS n FROM p_audit WHERE action='outcome.crm.revoke' AND subject=?").bind(row.id).first<{n:number}>()
 guard.sql+=" AND (SELECT COUNT(*) FROM p_audit WHERE action='outcome.crm.revoke' AND subject=?)=?";guard.values.push(row.id,revocations?.n??0)
 if(p.enabled===false||p.enabled==='no'){
  await commit(db,a,[db.prepare('DELETE FROM p_crm_outcome_authority WHERE proposal_id=?').bind(row.id),db.prepare('UPDATE p_crm_outcome_bindings SET version=version+1 WHERE proposal_id=?').bind(row.id),db.prepare('INSERT INTO p_audit(id,actor_id,actor_role,action,subject,occurred_at) VALUES(?,?,?,?,?,?)').bind(crypto.randomUUID(),a.id,a.role,'outcome.crm.revoke',row.id,at)],false,guard);return {saved:true}
 }
 need(['draft','approved','sent'].includes(row.status),'Authorize CRM outcomes on an open proposal',409)
 need(!await db.prepare('SELECT 1 FROM p_negotiations WHERE proposal_id=?').bind(row.id).first(),'Send the negotiated revision before authorizing its CRM outcome',409)
 guard.sql+=' AND NOT EXISTS(SELECT 1 FROM p_negotiations WHERE proposal_id=?)';guard.values.push(row.id)
 need(!await db.prepare('SELECT 1 FROM (SELECT * FROM p_outcomes UNION ALL SELECT * FROM p_outcome_records) WHERE proposal_id=? AND revision=?').bind(row.id,row.revision).first(),'Authorize the destination before recording the outcome',409)
 need(p.consent===true||p.consent==='yes','Explicitly authorize this proposal outcome to update the selected CRM deal')
 const {connection,secret}=await providerCredential(env,'workspace:hubspot'),deal=identifier(p.dealId,'the HubSpot deal id'),pipeline=identifier(p.pipelineId,'the HubSpot pipeline id'),won=identifier(p.wonStage,'the Closed won stage id'),lost=identifier(p.lostStage,'the Closed lost stage id')
 need(won!==lost,'Choose distinct won and lost stages')
 const [pipelines,remote]=await Promise.all([providerJson('https://api.hubapi.com/crm/v3/pipelines/deals',secret.token),providerJson('https://api.hubapi.com/crm/v3/objects/deals/'+encodeURIComponent(deal)+'?properties=pipeline,dealstage',secret.token)])
 const stages=pipelines.results?.find((r:any)=>String(r.id)===pipeline)?.stages??[],valid=(id:string,probability:string)=>stages.some((s:any)=>String(s.id)===id&&String(s.metadata?.isClosed)==='true'&&String(s.metadata?.probability)===probability)
 need(valid(won,'1.0')||valid(won,'1'),'HubSpot must confirm the selected Closed won stage')
 need(valid(lost,'0.0')||valid(lost,'0'),'HubSpot must confirm the selected Closed lost stage')
 need(String(remote.id)===deal&&String(remote.properties?.pipeline)===pipeline,'Choose a deal in the confirmed pipeline')
 guard.sql+=" AND EXISTS(SELECT 1 FROM p_connections WHERE id='workspace:hubspot' AND version=? AND status='connected' AND broken_at IS NULL)";guard.values.push(connection.version)
 const auditId=crypto.randomUUID()
 await commit(db,a,[db.prepare('INSERT INTO p_crm_outcome_bindings(proposal_id,revision,version,account_id,connection_version,deal_id,pipeline_id,won_stage,lost_stage,actor_id,configured_at) VALUES(?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(proposal_id) DO UPDATE SET revision=excluded.revision,version=excluded.version,account_id=excluded.account_id,connection_version=excluded.connection_version,deal_id=excluded.deal_id,pipeline_id=excluded.pipeline_id,won_stage=excluded.won_stage,lost_stage=excluded.lost_stage,actor_id=excluded.actor_id,configured_at=excluded.configured_at').bind(row.id,row.revision,version,connection.account_id,connection.version,deal,pipeline,won,lost,a.id,at),db.prepare('INSERT INTO p_crm_outcome_authority(proposal_id,binding_version) VALUES(?,?) ON CONFLICT(proposal_id) DO UPDATE SET binding_version=excluded.binding_version').bind(row.id,version),db.prepare('INSERT INTO p_audit(id,actor_id,actor_role,action,subject,occurred_at) VALUES(?,?,?,?,?,?)').bind(auditId,a.id,a.role,'outcome.crm.authorize',row.id,at),db.prepare('INSERT INTO p_crm_outcome_consents(audit_id,proposal_id,revision,binding_version,account_id,connection_version,deal_id,pipeline_id,won_stage,lost_stage) VALUES(?,?,?,?,?,?,?,?,?,?)').bind(auditId,row.id,row.revision,version,connection.account_id,connection.version,deal,pipeline,won,lost)],false,guard)
 return {saved:true}
}
/** A failed or uncertain write is retained and never automatically replayed. */
export async function synchronizeOutcome(env:Bindings,id:string){
 const db=env.DB,row=await db.prepare('SELECT * FROM p_proposals WHERE id=?').bind(id).first<any>(),outcome=row?await db.prepare('SELECT * FROM (SELECT * FROM p_outcomes UNION ALL SELECT * FROM p_outcome_records) WHERE proposal_id=? AND revision=?').bind(id,row.revision).first<any>():null,binding=await db.prepare('SELECT b.* FROM p_crm_outcome_bindings b JOIN p_crm_outcome_authority a ON a.proposal_id=b.proposal_id AND a.binding_version=b.version WHERE b.proposal_id=?').bind(id).first<any>()
 if(!outcome||!binding||binding.revision!==row.revision)return
 const available=async()=>{
  const actor=await actorById(db,binding.actor_id);if(!actor||!administrators.includes(actor.role))return false
  try{await permitted(db,actor,id,'send')}catch{return false}
  return Boolean(await db.prepare(`SELECT 1 FROM p_crm_outcome_bindings b WHERE b.proposal_id=? AND b.version=? AND b.revision=? AND ${liveBinding}`).bind(id,binding.version,row.revision).first())
 }
 if(!await available())return
 const stage=outcome.kind==='won'?binding.won_stage:binding.lost_stage,at=await currentTime(db),claim=await db.prepare("INSERT INTO p_crm_outcome_attempts(proposal_id,revision,kind,account_id,deal_id,stage_id,status,attempted_at) VALUES(?,?,?,?,?,?,'sending',?) ON CONFLICT DO NOTHING").bind(id,row.revision,outcome.kind,binding.account_id,binding.deal_id,stage,at).run()
 if(!claim.meta.changes)return
 try{
  const {secret}=await providerCredential(env,'workspace:hubspot')
  // Confirm the destination immediately before the bounded stage-only write.
  const remote=await providerJson('https://api.hubapi.com/crm/v3/objects/deals/'+encodeURIComponent(binding.deal_id)+'?properties=pipeline,dealstage',secret.token)
  if(String(remote.id)!==binding.deal_id||String(remote.properties?.pipeline)!==binding.pipeline_id||!await available()){await db.prepare("UPDATE p_crm_outcome_attempts SET status='withheld' WHERE proposal_id=? AND revision=?").bind(id,row.revision).run();return}
  const receipt=await demoEffect(async()=>{
   const payload=Response.json({properties:{dealstage:stage}});payload.headers.set('authorization','Bearer '+secret.token)
   const response=await fetch('https://api.hubapi.com/crm/v3/objects/deals/'+encodeURIComponent(binding.deal_id),{method:'PATCH',headers:payload.headers,body:payload.body,redirect:'manual'})
   need(response.ok,'CRM did not confirm the outcome',409);const body=await response.text();need(body.length<=262144,'CRM response too large',409);return JSON.parse(body)
  },()=>({id:binding.deal_id,properties:{dealstage:stage}}))
  need(String(receipt.id)===binding.deal_id&&String(receipt.properties?.dealstage)===stage,'CRM outcome receipt does not match',409)
  await db.prepare("UPDATE p_crm_outcome_attempts SET status='confirmed',confirmed_at=? WHERE proposal_id=? AND revision=?").bind(await currentTime(db),id,row.revision).run()
 }catch{await db.prepare("UPDATE p_crm_outcome_attempts SET status='uncertain' WHERE proposal_id=? AND revision=?").bind(id,row.revision).run()}
}
