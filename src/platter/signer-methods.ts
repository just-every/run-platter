import type { Bindings } from '../auth.server'
import { commit, exact, need, type Actor } from './model'
import { permitted, senders } from './permissions'
import { currentTime } from './expiry-time'
import { smsCodeContext, smsGuard } from './sms'

export async function signerMethodCommand(env:Bindings,a:Actor,p:Record<string,unknown>){
 need(senders.includes(a.role),'Only proposal senders choose a signer method',403)
 const db=env.DB,row=await permitted(db,a,p.id,'send');exact(row,p);need(row.recipient_plan==='[]','Configured recipients verify their own mailbox',409)
 need(row.status==='sent','Choose the method on the current sent invitation',409)
 need(p.method==='mailbox code'||p.method==='SMS code','Choose mailbox code or SMS code')
 if(p.method==='SMS code')need(row.client_locale!=='es','Spanish currently requires mailbox verification',409)
 const sms=p.method==='SMS code'?await smsCodeContext(env,row.id,false):null
 const share=await db.prepare('SELECT * FROM p_shares WHERE proposal_id=?').bind(row.id).first<any>()
 need(share&&share.revision===row.revision&&share.code_generation===0&&!share.session_hash,'Reissue the invitation before changing an identity method already used',409)
 const at=await currentTime(db)
 await commit(db,a,[db.prepare('INSERT INTO p_signer_methods VALUES(?,?,?,?,?) ON CONFLICT(proposal_id) DO UPDATE SET revision=excluded.revision,method=excluded.method,configured_by=excluded.configured_by,configured_at=excluded.configured_at').bind(row.id,row.revision,p.method,a.id,at),db.prepare('INSERT INTO p_audit(id,actor_id,actor_role,action,subject,occurred_at) VALUES(?,?,?,?,?,?)').bind(crypto.randomUUID(),a.id,a.role,'signer.method',row.id,at)],false,{sql:"EXISTS(SELECT 1 FROM p_proposals p JOIN p_shares s ON s.proposal_id=p.id WHERE p.id=? AND p.version=? AND p.status='sent' AND s.token=? AND s.code_generation=0 AND s.session_hash IS NULL)"+(sms?' AND '+smsGuard(sms).sql:''),values:[row.id,row.version,share.token,...(sms?smsGuard(sms).values:[])]})
 return {id:row.id}
}
// A revision may invalidate authorization, but never silently weakens an SMS requirement.
export async function signerMethod(db:D1Database,id:string,revision:number){
 return (await db.prepare("SELECT method FROM p_signer_methods WHERE proposal_id=? AND (revision=? OR method='SMS code')").bind(id,revision).first<any>())?.method??'mailbox code'
}
