import { reminderPolicy, reminderQuiet } from './reminders'
import { currentTime } from './expiry-time'
import { approvalPlan } from './approvals'
import type { Bindings } from '../auth.server'
import { actorById } from './credentials'
import { providerCredential, providerJson, sealCredential, openCredential } from './connections'
import { commit, email, hash, need, secret, text, type Actor } from './model'
import { permitted, senders } from './permissions'

const roles=[...senders,'billing']
const sendScope=(provider:string)=>provider==='gmail'?'https://www.googleapis.com/auth/gmail.send':'Mail.Send'
function config(env:Bindings,provider:string){
 need(['gmail','microsoft'].includes(provider),'Choose Google or Microsoft')
 const google=provider==='gmail',clientId=google?env.GOOGLE_MAIL_CLIENT_ID:env.MICROSOFT_MAIL_CLIENT_ID,clientSecret=google?env.GOOGLE_MAIL_CLIENT_SECRET:env.MICROSOFT_MAIL_CLIENT_SECRET
 need(clientId&&clientSecret,'The owner must configure this provider’s OAuth application before connecting a mailbox',503)
 return {clientId,clientSecret,authorize:google?'https://accounts.google.com/o/oauth2/v2/auth':'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',token:google?'https://oauth2.googleapis.com/token':'https://login.microsoftonline.com/common/oauth2/v2.0/token',scopes:google?'openid email https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/gmail.settings.basic':'openid email offline_access User.Read Mail.Send',redirect:env.AUTH_ORIGIN+'/api/platter/mailbox/callback'}
}
const base64url=(bytes:Uint8Array)=>btoa(Array.from(bytes,c=>String.fromCharCode(c)).join('')).replaceAll('+','-').replaceAll('/','_').replaceAll('=','')
async function tokenRequest(env:Bindings,provider:string,parameters:Record<string,string>){
 const c=config(env,provider),r=await fetch(c.token,{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:c.clientId,client_secret:c.clientSecret,...parameters}),redirect:'manual',signal:AbortSignal.timeout(15000)})
 need(r.ok,'The provider refused this mailbox grant',409)
 const raw=await r.text();need(raw.length<=32768,'The provider grant response was too large',409)
 let result:any;try{result=JSON.parse(raw)}catch{need(false,'The provider grant response was invalid',409)}
 need(typeof result.access_token==='string'&&result.access_token.length>0&&result.access_token.length<=8192&&!/[\r\n\0]/.test(result.access_token),'The provider did not return a valid mailbox grant',409)
 return result
}
function scopes(provider:string,value:unknown){need(typeof value==='string'&&value.split(/\s+/).some(s=>s===sendScope(provider)||(provider==='microsoft'&&s==='https://graph.microsoft.com/Mail.Send')),'The provider grant must allow sending mail',403);return String(value)}
async function identity(provider:string,token:string,address?:string){
 if(provider==='gmail'){
  const info=await providerJson('https://openidconnect.googleapis.com/v1/userinfo',token)
  need(info.email_verified===true,'Verify the provider mailbox first',403)
  const primary=email(info.email),chosen=address?email(address):primary
  if(chosen!==primary){
   const aliases=await providerJson('https://gmail.googleapis.com/gmail/v1/users/me/settings/sendAs',token)
   need(Array.isArray(aliases.sendAs)&&aliases.sendAs.some((a:any)=>a.verificationStatus==='accepted'&&String(a.sendAsEmail).toLowerCase()===chosen),'Google has not verified this sending alias',403)
  }
  return {address:chosen,accountId:text(info.sub,'the verified Google account')}
 }
 const info=await providerJson('https://graph.microsoft.com/v1.0/me?$select=id,mail',token),primary=email(info.mail)
 need(!address||email(address)===primary,'Use this Microsoft account’s own SMTP mailbox',403)
 return {address:primary,accountId:text(info.id,'the verified Microsoft account')}
}
async function unbound(db:D1Database,a:Actor,address:string){
 need(!await db.prepare("SELECT id FROM oa_operators WHERE lower(email)=? AND id!=? AND status='active'").bind(address,a.id).first(),'This mailbox is another active member’s sign-in address',403)
 need(!await db.prepare("SELECT id FROM p_connections WHERE lower(mailbox_email)=? AND operator_id!=? AND status='connected'").bind(address,a.id).first(),'This mailbox belongs to another member’s connection',403)
}
export async function mailboxAuthorize(env:Bindings,a:Actor,p:Record<string,unknown>){
 need(roles.includes(a.role),'Your role cannot connect a mailbox',403)
 need(p.consent===true||p.consent==='yes','Authorize connecting your own mailbox')
 const provider=String(p.provider),c=config(env,provider),state=secret(),digest=await hash(state),verifier=secret()
 const address=p.mailboxEmail?email(p.mailboxEmail):null,connectionId='mailbox:'+provider+':'+a.id
 const version=(await env.DB.prepare('SELECT version FROM p_connections WHERE id=?').bind(connectionId).first<any>())?.version??0
 const sealed=await sealCredential(env,'oauth:'+digest,{verifier})
 await commit(env.DB,a,[env.DB.prepare('DELETE FROM p_mailbox_oauth WHERE operator_id=?').bind(a.id),env.DB.prepare('INSERT INTO p_mailbox_oauth(state_hash,operator_id,provider,mailbox_email,connection_version,sealed,expires_at) VALUES(?,?,?,?,?,?,?)').bind(digest,a.id,provider,address,version,sealed,Date.now()+600000)])
 const challenge=base64url(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(verifier))))
 const url=new URL(c.authorize);url.search=new URLSearchParams({client_id:c.clientId,redirect_uri:c.redirect,response_type:'code',scope:c.scopes,state,code_challenge:challenge,code_challenge_method:'S256',...(provider==='gmail'?{access_type:'offline',prompt:'consent'}:{})}).toString()
 return {url:url.href}
}
export async function mailboxCallback(env:Bindings,a:Actor,url:URL){
 need(roles.includes(a.role),'Your role cannot connect a mailbox',403)
 const digest=await hash(text(url.searchParams.get('state'),'the authorization state',200)),g=await env.DB.prepare('SELECT * FROM p_mailbox_oauth WHERE state_hash=? AND operator_id=? AND expires_at>? AND consumed_at IS NULL').bind(digest,a.id,Date.now()).first<any>()
 need(g,'This mailbox authorization has expired or was already used',403)
 const claim=await env.DB.prepare('UPDATE p_mailbox_oauth SET consumed_at=? WHERE state_hash=? AND consumed_at IS NULL').bind(Date.now(),digest).run();need(claim.meta.changes,'This mailbox authorization was already used',403)
 need(!url.searchParams.has('error'),'The provider did not authorize this connection',403)
 const c=config(env,g.provider),saved=await openCredential(env,'oauth:'+digest,g.sealed)
 const grant=await tokenRequest(env,g.provider,{grant_type:'authorization_code',code:text(url.searchParams.get('code'),'the authorization code',8192),redirect_uri:c.redirect,code_verifier:saved.verifier})
 const scope=scopes(g.provider,grant.scope),refreshToken=text(grant.refresh_token,'a renewable provider grant',8192),verified=await identity(g.provider,grant.access_token,g.mailbox_email??undefined)
 await unbound(env.DB,a,verified.address)
 const id='mailbox:'+g.provider+':'+a.id,sealed=await sealCredential(env,id,{provider:g.provider,accountId:verified.accountId,token:grant.access_token,refreshToken,scope})
 await commit(env.DB,a,[
  env.DB.prepare("INSERT INTO p_connections(id,provider,operator_id,account_id,mailbox_email,status,connected_by,connected_at) VALUES(?,?,?,?,?,'connected',?,?) ON CONFLICT(id) DO UPDATE SET account_id=excluded.account_id,mailbox_email=excluded.mailbox_email,status='connected',version=p_connections.version+1,broken_at=NULL,connected_by=excluded.connected_by,connected_at=excluded.connected_at").bind(id,g.provider,a.id,verified.accountId,verified.address,a.id,Date.now()),
  env.DB.prepare('INSERT INTO p_connection_secrets(connection_id,sealed) VALUES(?,?) ON CONFLICT(connection_id) DO UPDATE SET sealed=excluded.sealed').bind(id,sealed),
 ],false,{sql:"COALESCE((SELECT version FROM p_connections WHERE id=?),0)=? AND NOT EXISTS(SELECT 1 FROM oa_operators WHERE lower(email)=? AND id!=? AND status='active') AND NOT EXISTS(SELECT 1 FROM p_connections WHERE lower(mailbox_email)=? AND operator_id!=? AND status='connected')",values:[id,g.connection_version,verified.address,a.id,verified.address,a.id]})
 return id
}
export async function sendingActor(env:Bindings,row:any){
 if(!row.sender_id)return null
 const a=await actorById(env.DB,row.sender_id);need(a&&senders.includes(a.role),'The sender no longer has permission to send',403)
 const proposal=await permitted(env.DB,a,row.proposal_id,'send')
 const reminder=await env.DB.prepare('SELECT r.*,t.share_hash,t.settings_version FROM p_reminder_transport t JOIN p_reminder_runs r ON r.id=t.run_id WHERE t.mail_id=?').bind(row.id).first<any>()
 if(reminder){
  const current=await env.DB.prepare('SELECT s.token,COALESCE(s.recipient,c.email) AS recipient,e.deadline_at FROM p_shares s JOIN p_proposals p ON p.id=s.proposal_id JOIN p_clients c ON c.id=p.client_id LEFT JOIN p_expiry e ON e.proposal_id=p.id WHERE p.id=? AND s.revision=p.revision').bind(proposal.id).first<any>()
  const at=await currentTime(env.DB)
  need(proposal.status==='sent'&&proposal.revision===reminder.revision&&current&&await hash(current.token)===reminder.share_hash&&current.recipient===reminder.recipient&&(current.deadline_at===null||current.deadline_at>at),'This reminder invitation is no longer open',403)
  need(!await env.DB.prepare('SELECT 1 FROM p_reminder_optouts WHERE proposal_id=? AND revision=? AND recipient=?').bind(proposal.id,proposal.revision,reminder.recipient).first(),'The recipient opted out of reminders',403)
  if(reminder.kind==='scheduled')need(!reminderQuiet(at,reminder.time_zone,await reminderPolicy(env.DB)),'Scheduled reminders wait for quiet hours to end',403)
  if(reminder.kind==='scheduled')need(await env.DB.prepare('SELECT 1 FROM p_reminder_settings s JOIN p_reminder_authority a ON a.proposal_id=s.proposal_id AND a.revision=s.revision AND a.settings_version=s.version WHERE s.proposal_id=? AND s.revision=? AND s.version=? AND s.enabled=1 AND s.sender_id=?').bind(proposal.id,proposal.revision,reminder.settings_version,a.id).first(),'Scheduled reminder consent changed',403)
 }
 if(row.requires_approval)need(proposal.revision===row.proposal_revision&&(await approvalPlan(env.DB,proposal,a)).complete,'Approve this revision under the current policy before sending',403)
 return a
}
export async function memberMailbox(env:Bindings,a:Actor){
 const row=await env.DB.prepare("SELECT * FROM p_connections WHERE operator_id=? AND provider IN ('gmail','microsoft') AND status='connected' ORDER BY connected_at DESC,id LIMIT 1").bind(a.id).first<any>()
 if(!row)return null
 if(row.broken_at)return {broken:true,connection:row}
 try{
  const stored=await providerCredential(env,row.id),c=stored.connection,grant=await tokenRequest(env,c.provider,{grant_type:'refresh_token',refresh_token:text(stored.secret.refreshToken,'a renewable provider grant',8192)})
  scopes(c.provider,grant.scope??stored.secret.scope)
  const verified=await identity(c.provider,grant.access_token,c.mailbox_email)
  need(verified.accountId===c.account_id,'The mailbox account changed',403);await unbound(env.DB,a,verified.address)
  const sealed=await sealCredential(env,c.id,{...stored.secret,token:grant.access_token,refreshToken:grant.refresh_token??stored.secret.refreshToken,scope:grant.scope??stored.secret.scope})
  await commit(env.DB,a,[env.DB.prepare('UPDATE p_connection_secrets SET sealed=? WHERE connection_id=?').bind(sealed,c.id)],false,{sql:"EXISTS(SELECT 1 FROM p_connections WHERE id=? AND version=? AND status='connected' AND broken_at IS NULL)",values:[c.id,c.version]})
  return {broken:false,connection:c,token:grant.access_token as string}
 }catch{
  await env.DB.prepare("UPDATE p_connections SET broken_at=? WHERE id=? AND version=? AND status='connected'").bind(Date.now(),row.id,row.version).run()
  return {broken:true,connection:row}
 }
}
export async function sendMailbox(env:Bindings,a:Actor,row:any,mailbox:NonNullable<Awaited<ReturnType<typeof memberMailbox>>>,replyTo?:string){
 // Refresh/identity checks can take time. Recheck current sending authority and
 // the exact connection immediately before the outbound operation.
 await sendingActor(env,row)
 const c=mailbox.connection
 need(await env.DB.prepare("SELECT id FROM p_connections WHERE id=? AND version=? AND status='connected' AND broken_at IS NULL").bind(c.id,c.version).first(),'The mailbox connection changed',403)
 await unbound(env.DB,a,c.mailbox_email)
 const from=email(c.mailbox_email),to=email(row.recipient)
 let response:Response
 if(c.provider==='gmail'){
  const header=(value:string)=>'=?UTF-8?B?'+btoa(Array.from(new TextEncoder().encode(value),c=>String.fromCharCode(c)).join(''))+'?='
  const raw=['From: '+from,'To: '+to,'Subject: '+header(row.subject),'MIME-Version: 1.0','Content-Type: text/plain; charset=UTF-8','Content-Transfer-Encoding: base64',...(replyTo?['Reply-To: '+replyTo]:[]),'',btoa(Array.from(new TextEncoder().encode(row.body),c=>String.fromCharCode(c)).join(''))].join('\r\n')
  response=await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send',{method:'POST',headers:{authorization:'Bearer '+mailbox.token,'content-type':'application/json'},body:JSON.stringify({raw:base64url(new TextEncoder().encode(raw))}),redirect:'manual',signal:AbortSignal.timeout(15000)})
 }else{
  response=await fetch('https://graph.microsoft.com/v1.0/me/sendMail',{method:'POST',headers:{authorization:'Bearer '+mailbox.token,'content-type':'application/json'},body:JSON.stringify({message:{subject:row.subject,body:{contentType:'Text',content:row.body},from:{emailAddress:{address:from}},toRecipients:[{emailAddress:{address:to}}],...(replyTo?{replyTo:[{emailAddress:{address:replyTo}}]}:{})},saveToSentItems:true}),redirect:'manual',signal:AbortSignal.timeout(15000)})
 }
 if([401,403].includes(response.status)){
  await env.DB.prepare('UPDATE p_connections SET broken_at=? WHERE id=? AND version=?').bind(Date.now(),c.id,c.version).run()
  return {fallback:true as const}
 }
 need(response.ok,'The mailbox sending result is uncertain',409)
 const result=c.provider==='gmail'?await response.json() as any:null
 return {fallback:false as const,status:'accepted' as const,providerMessageId:result?.id??null}
}
export async function recordSender(env:Bindings,row:any,route:string,address:string,outcome:string,fallback:boolean){
 if(!row.sender_id)return
 const a=await actorById(env.DB,row.sender_id)
 await env.DB.batch([
  env.DB.prepare('INSERT INTO p_mail_attributions(mail_id,proposal_id,actor_id,route,sender_address,outcome,fallback,occurred_at) VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(mail_id) DO NOTHING').bind(row.id,row.proposal_id,row.sender_id,route,address,outcome,fallback?1:0,Date.now()),
  env.DB.prepare("INSERT INTO p_audit(id,actor_id,actor_role,action,subject,occurred_at) VALUES(?,?,?,?,?,?) ON CONFLICT(id) DO NOTHING").bind(row.id,row.sender_id,a?.role??'inactive','mail.'+outcome,row.proposal_id,Date.now()),
 ])
}
