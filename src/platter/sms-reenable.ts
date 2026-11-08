import type {Bindings} from '../auth.server'
import {currentTime} from './expiry-time'
import {hash,need} from './model'

const transportBinding=(env:Bindings)=>hash(JSON.stringify([env.SMS_PROVIDER,env.TWILIO_ACCOUNT_SID,env.TWILIO_AUTH_TOKEN,env.TWILIO_FROM]))

/** Only an authenticated Advanced Opt-Out receipt proves provider opt-in here.
 * It never changes suppression, consent or operational sending authority. */
export async function recordProviderOptIn(env:Bindings,form:URLSearchParams,phone:string){
 if(env.SMS_PROVIDER!==undefined&&env.SMS_PROVIDER!=='twilio'||form.get('OptOutType')!=='START')return
 const id=form.get('MessageSid')??''
 need(/^[A-Za-z0-9-]{1,100}$/.test(id),'A provider opt-in needs its message receipt')
 const db=env.DB,at=await currentTime(db),binding=await transportBinding(env)
 await db.batch([
  db.prepare('INSERT INTO p_sms_provider_optins(id,phone,transport_hash,received_at) VALUES(?,?,?,?) ON CONFLICT DO NOTHING').bind(id,phone,binding,at),
  db.prepare(`INSERT INTO p_sms_reenable_eligibility(phone,event_id,stopped_at)
   SELECT phone,?,stopped_at FROM p_sms_optouts WHERE phone=? AND changes()=1
   ON CONFLICT(phone) DO UPDATE SET event_id=excluded.event_id,stopped_at=excluded.stopped_at`).bind(id,phone),
 ])
}

export async function reenableEligibility(env:Bindings,phone:string){
 if(env.SMS_PROVIDER!==undefined&&env.SMS_PROVIDER!=='twilio')return null
 return env.DB.prepare(`SELECT e.event_id,e.stopped_at,o.source,p.received_at FROM p_sms_reenable_eligibility e
 JOIN p_sms_optouts o ON o.phone=e.phone AND o.stopped_at=e.stopped_at
 JOIN p_sms_provider_optins p ON p.id=e.event_id AND p.phone=e.phone
 WHERE e.phone=? AND p.transport_hash=?`).bind(phone,await transportBinding(env)).first<any>()
}

export function reenableStatements(db:D1Database,phone:string,id:string,assentId:string,actorId:string,at:number,eligibility:any){
 return [
  db.prepare('INSERT INTO p_sms_reenable_history(id,phone,proposal_id,assent_id,actor_id,provider_event_id,stopped_at,source,reenabled_at) VALUES(?,?,?,?,?,?,?,?,?)').bind(crypto.randomUUID(),phone,id,assentId,actorId,eligibility.event_id,eligibility.stopped_at,eligibility.source,at),
  db.prepare('DELETE FROM p_sms_optouts WHERE phone=?').bind(phone),
  db.prepare('DELETE FROM p_sms_reenable_eligibility WHERE phone=?').bind(phone),
 ]
}
