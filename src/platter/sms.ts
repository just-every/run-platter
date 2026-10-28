import { clientText, type ClientLocale } from './locales'
import { recipientPlan } from './recipients'
import { demoEffect } from '@runeditrun/rer/internal/modules/demo/index.mjs'
import type { Bindings } from '../auth.server'
import { actorById } from './credentials'
import { currentTime, localDate } from './expiry-time'
import { expiryFor, expiryOpenSql } from './expiry'
import { commit, exact, hash, need, text, type Actor } from './model'
import { permitted, senders } from './permissions'
import { reminderPolicy } from './reminders'
import { afterQuietHours, reminderSlots } from './reminder-schedule'
import { validZone } from './reports/zone'

const audit=(db:D1Database,a:Actor,action:string,id:string,at:number)=>db.prepare('INSERT INTO p_audit(id,actor_id,actor_role,action,subject,occurred_at) VALUES(?,?,?,?,?,?)').bind(crypto.randomUUID(),a.id,a.role,action,id,at)
const liveSql="EXISTS(SELECT 1 FROM p_proposals p JOIN p_shares s ON s.proposal_id=p.id JOIN p_sms_consent c ON c.proposal_id=p.id JOIN p_sms_authority a ON a.proposal_id=p.id WHERE p.id=? AND p.revision=? AND p.status='sent' AND s.revision=p.revision AND c.revision=p.revision AND a.revision=p.revision AND c.phone=? AND c.consented_at=a.consented_at AND a.actor_id=? AND a.share_hash=? AND s.token=? AND c.consented_at=? AND c.time_zone=? AND NOT EXISTS(SELECT 1 FROM p_sms_optouts o WHERE o.phone=c.phone) AND NOT EXISTS(SELECT 1 FROM p_acceptances x WHERE x.proposal_id=p.id) AND NOT EXISTS(SELECT 1 FROM p_withdrawals w WHERE w.proposal_id=p.id AND w.revision=p.revision) AND "+expiryOpenSql('p')+')'

async function live(env:Bindings,id:string,completed=false){
 const db=env.DB,c=await db.prepare('SELECT c.*,a.share_hash,a.member_version FROM p_sms_consent c JOIN p_sms_authority a ON a.proposal_id=c.proposal_id AND a.revision=c.revision AND a.consented_at=c.consented_at WHERE c.proposal_id=?').bind(id).first<any>()
 need(c,'Record fresh SMS consent before sending',409)
 const a=await actorById(db,c.actor_id);need(a&&senders.includes(a.role)&&(a.memberVersion??0)===c.member_version,'SMS sender authority changed',409)
 const row=await permitted(db,a,id,'send');need(!recipientPlan(row).length,'Configure mailbox verification for multiple recipients',409);const share=await db.prepare('SELECT * FROM p_shares WHERE proposal_id=?').bind(id).first<any>(),at=await currentTime(db)
 need((row.status==='sent'||completed&&row.status==='accepted')&&row.revision===c.revision&&!(await expiryFor(db,row,at)).expired&&share&&share.revision===row.revision&&await hash(share.token)===c.share_hash,'SMS invitation is no longer current',409)
 need(!await db.prepare('SELECT 1 FROM p_sms_optouts WHERE phone=?').bind(c.phone).first(),'This number has opted out of SMS',409)
 return {a,c,row,share,at,values:[id,row.revision,c.phone,a.id,c.share_hash,share.token,c.consented_at,c.time_zone,at]}
}
export async function smsCommand(env:Bindings,a:Actor,name:string,p:Record<string,unknown>){
 need(senders.includes(a.role),'Your role cannot send SMS',403)
 const db=env.DB,row=await permitted(db,a,p.id,'send'),at=await currentTime(db)
 if(name==='sms.configure'){
  exact(row,p);need(row.status==='sent'&&!(await expiryFor(db,row,at)).expired,'Send an approved invitation before configuring SMS',409)
  need(p.consent===true,'Record explicit recipient SMS consent')
  const phone=text(p.phone,'a US mobile number',12),zone=text(p.timeZone,'the recipient IANA time zone',100),evidence=text(p.evidence,'the recorded consent reference',1000)
  need(/^\+1[2-9]\d{2}[2-9]\d{6}$/.test(phone),'Use a US mobile number in international format');need(validZone(zone),'Supply the recipient IANA time zone')
  need(!await db.prepare('SELECT 1 FROM p_sms_optouts WHERE phone=?').bind(phone).first(),'STOP remains in force; sending cannot be reactivated here',409)
  const share=await db.prepare('SELECT * FROM p_shares WHERE proposal_id=? AND revision=?').bind(row.id,row.revision).first<any>();need(share,'Send a current invitation first',409)
  await commit(db,a,[db.prepare('INSERT INTO p_sms_consent VALUES(?,?,?,?,?,?,?) ON CONFLICT(proposal_id) DO UPDATE SET revision=excluded.revision,phone=excluded.phone,time_zone=excluded.time_zone,evidence=excluded.evidence,actor_id=excluded.actor_id,consented_at=excluded.consented_at').bind(row.id,row.revision,phone,zone,evidence,a.id,at),db.prepare('INSERT INTO p_sms_authority VALUES(?,?,?,?,?,?) ON CONFLICT(proposal_id) DO UPDATE SET revision=excluded.revision,share_hash=excluded.share_hash,actor_id=excluded.actor_id,member_version=excluded.member_version,consented_at=excluded.consented_at').bind(row.id,row.revision,await hash(share.token),a.id,a.memberVersion??0,at),db.prepare("UPDATE p_sms_runs SET status='cancelled' WHERE proposal_id=? AND status='queued'").bind(row.id),db.prepare("UPDATE p_shares SET code_hash=NULL,session_hash=NULL,session_expires=NULL WHERE proposal_id=? AND EXISTS(SELECT 1 FROM p_signer_methods WHERE proposal_id=? AND revision=? AND method='SMS code')").bind(row.id,row.id,row.revision),audit(db,a,'sms.consent',row.id,at)],false,{sql:"EXISTS(SELECT 1 FROM p_proposals WHERE id=? AND version=? AND revision=? AND status='sent') AND EXISTS(SELECT 1 FROM p_shares WHERE proposal_id=? AND token=?) AND NOT EXISTS(SELECT 1 FROM p_sms_optouts WHERE phone=?)",values:[row.id,row.version,row.revision,row.id,share.token,phone]})
  return {id:row.id}
 }
 need(name==='sms.send','Unknown SMS command',404)
 const context=await live(env,row.id);need(context.a.id===a.id,'Only the consenting sender can send this SMS',403)
 const kind=p.kind===undefined?'invitation':String(p.kind);need(['invitation','manual'].includes(kind),'Choose invitation or manual reminder')
 const message=text(p.message,'the SMS message',1000);need(!/https?:|\{[^}]+\}/i.test(message),'SMS links are added by Platter; fill all variables first')
 const requestId=text(p.requestId,'an SMS request id',100),prior=await db.prepare('SELECT * FROM p_sms_runs WHERE request_id=?').bind(requestId).first<any>()
 if(prior){need(prior.proposal_id===row.id&&prior.revision===row.revision&&prior.actor_id===a.id&&prior.kind===kind&&prior.message===message,'SMS request id was already used',409);return {id:row.id,smsId:prior.id,replayed:true}}
 const slot=kind==='manual'?localDate(at,context.c.time_zone):crypto.randomUUID()
 if(kind==='manual')need(!await db.prepare("SELECT 1 FROM p_sms_runs WHERE proposal_id=? AND phone=? AND kind='manual' AND slot=?").bind(row.id,context.c.phone,slot).first(),'One manual SMS reminder per recipient calendar day is allowed',429)
 const id=await enqueue(env,context,kind,slot,message,requestId)
 await flushSms(env)
 return {id:row.id,smsId:id}
}
async function enqueue(env:Bindings,ctx:Awaited<ReturnType<typeof live>>,kind:string,slot:string,message:string,requestId:string,extra?:{sql:string;values:any[];settingsVersion?:number}){
 const {a,c,row,at}=ctx,db=env.DB,id=crypto.randomUUID(),due=afterQuietHours(at,c.time_zone,await reminderPolicy(db))
 await commit(db,a,[db.prepare('INSERT INTO p_sms_runs(id,proposal_id,revision,phone,time_zone,actor_id,kind,slot,settings_version,message,queued_at,due_at,status,request_id) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,\'queued\',?)').bind(id,row.id,row.revision,c.phone,c.time_zone,a.id,kind,slot,extra?.settingsVersion??null,message,at,due,requestId),audit(db,a,'sms.'+kind,row.id,at)],false,{sql:liveSql+(extra?' AND '+extra.sql:''),values:[...ctx.values,...(extra?.values??[])]})
 return id
}
export async function smsHistory(env:Bindings,a:Actor,id:unknown){
 const row=await permitted(env.DB,a,id,'send');need(senders.includes(a.role),'Only proposal senders read SMS history',403)
 return {consent:await env.DB.prepare('SELECT * FROM p_sms_consent WHERE proposal_id=?').bind(row.id).first(),messages:(await env.DB.prepare('SELECT id,revision,phone,kind,message,queued_at,due_at,status FROM p_sms_runs WHERE proposal_id=? ORDER BY queued_at,id').bind(row.id).all()).results}
}
/** Claim before transport; ambiguous results are held and never automatically retried. */
export async function flushSms(env:Bindings){
 const db=env.DB,at=await currentTime(db),rows=(await db.prepare("SELECT * FROM p_sms_runs WHERE status='queued' AND due_at<=? ORDER BY queued_at,id LIMIT 100").bind(at).all<any>()).results
 for(const r of rows){
  let ctx:Awaited<ReturnType<typeof live>>
  try{ctx=await live(env,r.proposal_id);need(ctx.row.revision===r.revision&&ctx.c.phone===r.phone&&ctx.a.id===r.actor_id,'SMS consent changed',409);if(r.kind==='scheduled')need(await db.prepare('SELECT 1 FROM p_reminder_settings s JOIN p_reminder_authority a ON a.proposal_id=s.proposal_id AND a.revision=s.revision AND a.settings_version=s.version WHERE s.proposal_id=? AND s.revision=? AND s.version=? AND s.enabled=1').bind(r.proposal_id,r.revision,r.settings_version).first(),'SMS reminder schedule changed',409);if(r.kind!=='invitation')need(!await db.prepare('SELECT 1 FROM p_reminder_optouts WHERE proposal_id=? AND revision=?').bind(r.proposal_id,r.revision).first(),'The recipient opted out of reminders',409)}catch(error){if(![400,403,409].includes((error as any).status))throw error;await db.prepare("UPDATE p_sms_runs SET status='cancelled' WHERE id=? AND status='queued'").bind(r.id).run();continue}
  const due=afterQuietHours(at,r.time_zone,await reminderPolicy(db));if(due>at){await db.prepare("UPDATE p_sms_runs SET due_at=? WHERE id=? AND status='queued'").bind(due,r.id).run();continue}
  if(!env.TWILIO_ACCOUNT_SID||!env.TWILIO_AUTH_TOKEN||!env.TWILIO_FROM||env.AUTH_LOCAL==='true')continue
  const reminderGuard=r.kind==='invitation'?{sql:'',values:[] as any[]}:{sql:' AND NOT EXISTS(SELECT 1 FROM p_reminder_optouts WHERE proposal_id=? AND revision=?)'+(r.kind==='scheduled'?' AND EXISTS(SELECT 1 FROM p_reminder_settings s JOIN p_reminder_authority a ON a.proposal_id=s.proposal_id AND a.revision=s.revision AND a.settings_version=s.version WHERE s.proposal_id=? AND s.revision=? AND s.version=? AND s.enabled=1)':''),values:[r.proposal_id,r.revision,...(r.kind==='scheduled'?[r.proposal_id,r.revision,r.settings_version]:[])]}
  try{await commit(db,ctx.a,[db.prepare("UPDATE p_sms_runs SET status='sending' WHERE id=? AND status='queued'").bind(r.id)],false,{sql:liveSql+" AND EXISTS(SELECT 1 FROM p_sms_runs WHERE id=? AND status='queued')"+reminderGuard.sql,values:[...ctx.values,r.id,...reminderGuard.values]})}catch(error){if((error as any).status===409)continue;throw error}
  try{
   const payload=new URLSearchParams({To:r.phone,From:env.TWILIO_FROM,Body:r.message+'\n'+env.AUTH_ORIGIN+'/p/'+ctx.share.token+'\nReply STOP to stop. HELP for help.',StatusCallback:env.AUTH_ORIGIN+'/api/platter/sms/status'})
   const response=await demoEffect(()=>fetch('https://api.twilio.com/2010-04-01/Accounts/'+encodeURIComponent(env.TWILIO_ACCOUNT_SID!)+'/Messages.json',{method:'POST',headers:{authorization:'Basic '+btoa(env.TWILIO_ACCOUNT_SID+':'+env.TWILIO_AUTH_TOKEN),'content-type':'application/x-www-form-urlencoded'},body:payload,redirect:'manual',signal:AbortSignal.timeout(15000)}),()=>Response.json({sid:'synthetic-platter-'+r.id}))
   const receipt=await response.json() as any
   need(response.ok&&typeof receipt.sid==='string'&&receipt.sid.length<=100,'SMS transport outcome uncertain',502)
   await db.prepare("UPDATE p_sms_runs SET provider_id=?,status='accepted' WHERE id=? AND status='sending'").bind(receipt.sid,r.id).run()
  }catch{await db.prepare("UPDATE p_sms_runs SET status='held' WHERE id=? AND status='sending'").bind(r.id).run()}
 }
}
export async function runSms(env:Bindings){
 const db=env.DB,now=await currentTime(db),settings=(await db.prepare("SELECT s.*,e.sent_at,e.expires_on,e.deadline_at FROM p_reminder_settings s JOIN p_reminder_authority a ON a.proposal_id=s.proposal_id AND a.revision=s.revision AND a.settings_version=s.version JOIN p_expiry e ON e.proposal_id=s.proposal_id WHERE s.enabled=1 AND e.sent_at IS NOT NULL").all<any>()).results
 for(const s of settings){
  try{
   const ctx=await live(env,s.proposal_id),config=JSON.parse(s.settings);need(ctx.c.time_zone===s.time_zone&&ctx.row.revision===s.revision,'SMS and email recipient settings differ',409)
   const slots=reminderSlots(config,s.sent_at,s.time_zone,{date:s.expires_on,deadlineAt:s.deadline_at},await reminderPolicy(db))
   for(const slot of slots.filter(slot=>slot.at<=now)){
    if(await db.prepare("SELECT 1 FROM p_sms_runs WHERE proposal_id=? AND revision=? AND kind='scheduled' AND slot=?").bind(s.proposal_id,s.revision,slot.id).first())continue
    await enqueue(env,ctx,'scheduled',slot.id,'Reminder: '+ctx.row.title,crypto.randomUUID(),{settingsVersion:s.version,sql:"EXISTS(SELECT 1 FROM p_reminder_settings s JOIN p_reminder_authority a ON a.proposal_id=s.proposal_id AND a.revision=s.revision AND a.settings_version=s.version WHERE s.proposal_id=? AND s.revision=? AND s.version=? AND s.enabled=1) AND (SELECT count(*) FROM p_sms_runs WHERE proposal_id=? AND revision=? AND kind='scheduled')<?",values:[s.proposal_id,s.revision,s.version,s.proposal_id,s.revision,config.cap]})
    break
   }
  }catch(error){if(![400,403,409].includes((error as any).status))throw error}
 }
 await flushSms(env)
}
async function twilioForm(request:Request,env:Bindings){
 need(request.method==='POST','Use a Twilio callback',405);need(env.TWILIO_AUTH_TOKEN&&env.TWILIO_ACCOUNT_SID&&env.TWILIO_FROM,'SMS callbacks are not configured',503)
 need(request.headers.get('content-type')?.startsWith('application/x-www-form-urlencoded'),'Use a Twilio form',415)
 const body=await request.text();need(body.length<=16384,'Callback too large',413)
 const form=new URLSearchParams(body),keys=[...new Set(form.keys())].sort();need(keys.every(k=>form.getAll(k).length===1),'Duplicate callback fields')
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(env.TWILIO_AUTH_TOKEN),{name:'HMAC',hash:'SHA-1'},false,['verify'])
 let signature:Uint8Array;try{signature=Uint8Array.from(atob(request.headers.get('x-twilio-signature')??''),c=>c.charCodeAt(0))}catch{need(false,'Invalid SMS callback signature',401)}
 need(await crypto.subtle.verify('HMAC',key,signature!.buffer as ArrayBuffer,new TextEncoder().encode(request.url+keys.map(k=>k+form.get(k)).join(''))),'Invalid SMS callback signature',401)
 need(form.get('AccountSid')===env.TWILIO_ACCOUNT_SID,'Wrong SMS account',403)
 return form
}
export async function smsWebhook(request:Request,env:Bindings,status:boolean){
 const form=await twilioForm(request,env),db=env.DB,at=await currentTime(db)
 if(status){
  const state=form.get('MessageStatus'),sid=form.get('MessageSid');need(sid&&['queued','sending','sent','delivered','undelivered','failed'].includes(state??''),'Invalid delivery callback')
  const result=state==='delivered'?'delivered':['undelivered','failed'].includes(state!)?'failed':'accepted'
  await db.prepare("UPDATE p_sms_runs SET status=? WHERE provider_id=? AND phone=? AND status IN ('sending','accepted','held')").bind(result,sid,form.get('To')).run()
  return new Response(null,{status:204})
 }
 need(form.get('To')===env.TWILIO_FROM,'Wrong inbound SMS destination',403)
 const phone=form.get('From')??'',word=(form.get('Body')??'').trim().toUpperCase();need(/^\+1\d{10}$/.test(phone),'Invalid inbound number')
 if(['STOP','STOPALL','UNSUBSCRIBE','CANCEL','END','QUIT'].includes(word)){
  await db.batch([db.prepare('INSERT INTO p_sms_optouts VALUES(?,?) ON CONFLICT DO NOTHING').bind(phone,at),db.prepare("UPDATE p_sms_runs SET status='cancelled' WHERE phone=? AND status='queued'").bind(phone),db.prepare('DELETE FROM p_sms_authority WHERE proposal_id IN (SELECT proposal_id FROM p_sms_consent WHERE phone=?)').bind(phone)])
 }
 // START does not restore consent. Twilio handles mandatory carrier STOP responses.
 return new Response(word==='HELP'?'<?xml version="1.0"?><Response><Message>Platter proposal messages. Contact the sender for help. Reply STOP to stop. Message and data rates may apply.</Message></Response>':'<?xml version="1.0"?><Response/>',{headers:{'content-type':'text/xml; charset=utf-8'}})
}

/** User-requested verification codes use the same explicit consent and quiet hours. */
export async function smsCodeContext(env:Bindings,id:string,quiet=true){
 const ctx=await live(env,id,true)
 need(env.TWILIO_ACCOUNT_SID&&env.TWILIO_AUTH_TOKEN&&env.TWILIO_FROM&&env.AUTH_LOCAL!=='true','Configure SMS transport before requesting a text code',409)
 if(quiet)need(afterQuietHours(ctx.at,ctx.c.time_zone,await reminderPolicy(env.DB))===ctx.at,'Text verification waits until recipient quiet hours end',429)
 return ctx
}
export async function deliverSmsCode(env:Bindings,id:string,code:string,locale:ClientLocale='en'){
 const ctx=await smsCodeContext(env,id)
 const body=new URLSearchParams({To:ctx.c.phone,From:env.TWILIO_FROM!,Body:clientText('Your Platter verification code is ',locale)+code+clientText('. It expires in 10 minutes. Reply STOP to stop. HELP for help.',locale)})
 const response=await demoEffect(()=>fetch('https://api.twilio.com/2010-04-01/Accounts/'+encodeURIComponent(env.TWILIO_ACCOUNT_SID!)+'/Messages.json',{method:'POST',headers:{authorization:'Basic '+btoa(env.TWILIO_ACCOUNT_SID+':'+env.TWILIO_AUTH_TOKEN),'content-type':'application/x-www-form-urlencoded'},body,redirect:'manual',signal:AbortSignal.timeout(15000)}),()=>Response.json({sid:'synthetic-platter-demo'}))
 need(response.ok,'The text code outcome is uncertain. Wait before requesting a new code.',409)
}
