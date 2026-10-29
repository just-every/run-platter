import type { Bindings } from '../auth.server'
import { enqueueSms, smsContext } from './sms'

/** Signing creates this local grant; neither historical acceptance nor restore can. */
export function completionSmsStatements(env:Bindings,id:string){
 return [env.DB.prepare(`INSERT INTO p_sms_completion_authority(proposal_id,revision,assent_id)
 SELECT x.proposal_id,x.revision,a.assent_id FROM p_acceptances x
 JOIN p_sms_authority a ON a.proposal_id=x.proposal_id AND a.revision=x.revision
 JOIN p_sms_assents f ON f.id=a.assent_id
 WHERE x.proposal_id=? AND EXISTS(SELECT 1 FROM json_each(f.purposes) WHERE value='completion')
 ON CONFLICT DO NOTHING`).bind(id)]
}

/** A required deposit must have exact client authorization and confirmed payment. */
export function completionSmsReadySql(){
 return `EXISTS(SELECT 1 FROM p_acceptances x
 JOIN p_sms_completion_authority g ON g.proposal_id=x.proposal_id AND g.revision=x.revision
 WHERE x.proposal_id=p.id AND x.revision=p.revision AND g.assent_id=a.assent_id
 AND p.status='accepted' AND (
 COALESCE(json_extract(x.snapshot,'$.collectionPolicy.enabled'),0)=0
 OR json_extract(x.snapshot,'$.collectionPolicy.completion')='due' OR x.deposit_cents=0
 OR EXISTS(SELECT 1 FROM p_collection_intents i WHERE i.proposal_id=x.proposal_id AND i.revision=x.revision
 AND i.status='succeeded' AND i.authorized_at IS NOT NULL AND i.deposit_cents=x.deposit_cents AND i.currency=x.currency)))`
}

export async function queueCompletionSms(env:Bindings,id?:string){
 const rows=(await env.DB.prepare(`SELECT g.* FROM p_sms_completion_authority g
 WHERE ${id?'g.proposal_id=? AND ':''}NOT EXISTS(SELECT 1 FROM p_sms_runs r
 WHERE r.proposal_id=g.proposal_id AND r.revision=g.revision AND r.kind='completion')`).bind(...(id?[id]:[])).all<any>()).results
 for(const grant of rows){
  try{
   const ctx=await smsContext(env,grant.proposal_id,'completion',true)
   await enqueueSms(env,ctx,'completion','completion','Your agreement is complete. Review your signed agreement and certificate.',crypto.randomUUID())
  }catch(error){if(![400,403,409].includes((error as any).status))throw error}
 }
}
