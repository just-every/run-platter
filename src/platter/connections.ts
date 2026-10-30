import type { Bindings } from '../auth.server'
import { verifyPaypalMerchant } from './paypal-provider'
import { administrators, senders } from './permissions'
import { commit, email, fail, need, text, type Actor } from './model'
const mailboxRoles=[...senders,'billing']
const isMailbox=(provider:string)=>provider==='gmail'||provider==='microsoft'
const connectionId=(provider:string,a:Actor)=>isMailbox(provider)?'mailbox:'+provider+':'+a.id:'workspace:'+provider
async function encryptionKey(env:Bindings){
 need(env.SESSION_SECRET?.length>=32,'Installation credential encryption is unavailable',503)
 const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode('platter-provider-credentials-v1\0'+env.SESSION_SECRET))
 return crypto.subtle.importKey('raw',digest,'AES-GCM',false,['encrypt','decrypt'])
}
export async function sealCredential(env:Bindings,id:string,value:unknown){
 const iv=crypto.getRandomValues(new Uint8Array(12)),data=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:new TextEncoder().encode(id)},await encryptionKey(env),new TextEncoder().encode(JSON.stringify(value)))
 const encoded=(v:Uint8Array)=>btoa(Array.from(v,b=>String.fromCharCode(b)).join(''))
 return JSON.stringify({iv:encoded(iv),data:encoded(new Uint8Array(data))})
}
export async function openCredential(env:Bindings,id:string,sealed:string){
 const envelope=JSON.parse(sealed),bytes=(v:string)=>Uint8Array.from(atob(v),c=>c.charCodeAt(0))
 const plaintext=await crypto.subtle.decrypt({name:'AES-GCM',iv:bytes(envelope.iv),additionalData:new TextEncoder().encode(id)},await encryptionKey(env),bytes(envelope.data))
 return JSON.parse(new TextDecoder().decode(plaintext))
}
export async function providerCredential(env:Bindings,id:string){
 const row=await env.DB.prepare("SELECT c.*,s.sealed FROM p_connections c JOIN p_connection_secrets s ON s.connection_id=c.id WHERE c.id=? AND c.status='connected'").bind(id).first<any>()
 need(row,'Connect this provider again before using it',409)
 try{
  const secret=await openCredential(env,id,row.sealed)
  need(secret.accountId===row.account_id&&secret.provider===row.provider,'Provider credential binding changed',409)
  return {connection:row,secret}
 }catch{return fail('Connect this provider again before using it',409)}
}
export async function providerJson(url:string,token:string){
 try{
  const response=await fetch(url,{headers:{authorization:'Bearer '+token,accept:'application/json'},redirect:'manual'})
  need(response.ok,'The provider refused the connection check',400)
  const body=await response.text();need(body.length<=262144,'The provider response was too large',400)
  const value=JSON.parse(body);need(value&&typeof value==='object','The provider response was invalid',400);return value
 }catch{fail('The provider connection check failed. Confirm the token and account, then try again.',400)}
}
export async function connectionState(env:Bindings,a:Actor){
 if(!mailboxRoles.includes(a.role))return []
 const rows=(await env.DB.prepare("SELECT c.*,EXISTS(SELECT 1 FROM p_connection_secrets s WHERE s.connection_id=c.id) AS has_secret FROM p_connections c WHERE c.operator_id=? OR (c.operator_id IS NULL AND ?=1) ORDER BY c.provider,c.id").bind(a.id,administrators.includes(a.role)?1:0).all<any>()).results
 return rows.map(r=>({id:r.id,provider:r.provider,operatorId:r.operator_id,accountId:r.account_id,mailboxEmail:r.mailbox_email,status:r.status==='connected'&&!r.has_secret?'needs_reconnection':r.broken_at?'broken':r.status,version:r.version,connectedAt:r.connected_at}))
}
export async function connectionCommand(env:Bindings,a:Actor,name:string,p:Record<string,unknown>){
 const provider=String(p.provider??'');need(['stripe','paypal','quickbooks','gmail','microsoft','hubspot','salesforce','google_drive','slack','teams'].includes(provider),'Choose a supported provider')
 need((isMailbox(provider)?mailboxRoles:administrators).includes(a.role),isMailbox(provider)?'Your role cannot connect a mailbox':'Only owner and admins connect workspace providers',403)
 need(p.operatorId===undefined||p.operatorId===a.id,'Connect only your own mailbox',403)
 const db=env.DB,id=connectionId(provider,a)
 need(p.id===undefined||p.id===id,'This connection belongs to another scope',403)
 const old=await db.prepare('SELECT * FROM p_connections WHERE id=?').bind(id).first<any>()
 need(Number(p.version)===(old?.version??0),'Connection changed. Reload.',409)
 const guard:{sql:string;values:any[]}={sql:'COALESCE((SELECT version FROM p_connections WHERE id=?),0)=?',values:[id,old?.version??0]}
 if(name==='provider.disconnect'){
  need(old,'Connection not found',404)
  await commit(db,a,[db.prepare("UPDATE p_connections SET status='disconnected',broken_at=NULL,version=version+1 WHERE id=?").bind(id),db.prepare('DELETE FROM p_connection_secrets WHERE connection_id=?').bind(id)],false,guard)
  return {id,status:'disconnected'}
 }
 need(name==='provider.connect','Unknown provider action',404)
 need(p.consent===true||p.consent==='yes','Confirm permission to connect this account')
 const token=text(p.token,'a provider token',8192);need(!/[\r\n\0]/.test(token),'Use a single-line provider token')
 let accountId:string,mailboxEmail:string|null=null,webhookSecret:string|undefined,instanceOrigin:string|undefined
 if(provider==='paypal'){
  accountId=await verifyPaypalMerchant(token,text(p.merchantId,'the PayPal merchant id',200))
  webhookSecret=text(p.webhookId,'the PayPal webhook id',200)
 }else if(provider==='stripe'){
  webhookSecret=p.webhookSecret?text(p.webhookSecret,'the Stripe webhook signing secret',8192):undefined
  if(p.publishableKey!==undefined&&p.publishableKey!=='')need(typeof p.publishableKey==='string'&&p.publishableKey.length>0&&p.publishableKey.length<=8192&&!/[\r\n\0]/.test(p.publishableKey),'Use the Stripe publishable key')
  const result=await providerJson('https://api.stripe.com/v1/account',token);accountId=text(result.id,'the verified provider account',200)
 }else if(provider==='quickbooks'){
  const realm=text(p.realmId,'the QuickBooks company id',100),result=await providerJson('https://quickbooks.api.intuit.com/v3/company/'+encodeURIComponent(realm)+'/companyinfo/'+encodeURIComponent(realm),token)
  need(result.CompanyInfo&&typeof result.CompanyInfo.CompanyName==='string','QuickBooks did not confirm this company');accountId=realm
 }else if(provider==='hubspot'){
  const result=await providerJson('https://api.hubapi.com/account-info/v3/details',token),value=result.portalId
  need((typeof value==='string'&&value.length>0)||(typeof value==='number'&&Number.isSafeInteger(value)&&value>0),'HubSpot did not confirm the portal');accountId=text(String(value),'the verified HubSpot portal',200)
 }else if(provider==='salesforce'){
  const result=await providerJson('https://login.salesforce.com/services/oauth2/userinfo',token);accountId=text(result.organization_id,'the verified Salesforce organization',200);need(typeof result.user_id==='string'&&result.user_id.length>0,'Salesforce did not confirm the authorized user')
  if(result.urls?.rest){const url=new URL(result.urls.rest);need(url.protocol==='https:'&&/\.(?:salesforce|force)\.com$/.test(url.hostname)&&!url.username&&!url.password,'Salesforce returned an invalid instance');instanceOrigin=url.origin}
 }else if(provider==='google_drive'){
  const result=await providerJson('https://www.googleapis.com/drive/v3/about?fields=user(displayName,emailAddress,permissionId)',token);accountId=text(result.user?.permissionId,'the verified Drive account',200);need(typeof result.user?.emailAddress==='string','Drive did not confirm the account')
 }else if(provider==='teams'){
  const result=await providerJson('https://graph.microsoft.com/v1.0/me?$select=id',token);accountId=text(result.id,'the verified Teams user',200)
 }else if(provider==='slack'){
  const result=await providerJson('https://slack.com/api/auth.test',token);need(result.ok===true,'Slack refused this connection');accountId=text(result.team_id,'the verified Slack workspace',200)
 }else{
  const result=await providerJson(provider==='gmail'?'https://openidconnect.googleapis.com/v1/userinfo':'https://graph.microsoft.com/v1.0/me?$select=id,mail,userPrincipalName',token)
  if(provider==='gmail')need(result.email_verified===true,'Verify the provider mailbox first',403)
  mailboxEmail=email(provider==='gmail'?result.email:result.mail)
  need(mailboxEmail===a.email.toLowerCase(),'Connect the mailbox matching your sign-in address',403)
  accountId=text(provider==='gmail'?result.sub:result.id,'the verified mailbox account',200)
 }
 if(mailboxEmail){
  const sql="NOT EXISTS(SELECT 1 FROM oa_operators WHERE lower(email)=? AND id!=? AND status='active') AND NOT EXISTS(SELECT 1 FROM p_connections WHERE lower(mailbox_email)=? AND operator_id!=? AND status='connected')",values=[mailboxEmail,a.id,mailboxEmail,a.id]
  need(await db.prepare('SELECT 1 WHERE '+sql).bind(...values).first(),'This mailbox is already bound to another member',403)
  guard.sql+=' AND '+sql;guard.values.push(...values)
 }
 const sealed=await sealCredential(env,id,{provider,token,accountId,...(instanceOrigin?{instanceOrigin}:{}),...(webhookSecret?(provider==='paypal'?{webhookId:webhookSecret}:{webhookSecret}):{}),...(provider==='stripe'&&p.publishableKey?{publishableKey:p.publishableKey}:{})}),at=Date.now()
 await commit(db,a,[db.prepare("INSERT INTO p_connections(id,provider,operator_id,account_id,mailbox_email,status,connected_by,connected_at) VALUES(?,?,?,?,?,'connected',?,?) ON CONFLICT(id) DO UPDATE SET account_id=excluded.account_id,mailbox_email=excluded.mailbox_email,status='connected',broken_at=NULL,version=p_connections.version+1,connected_by=excluded.connected_by,connected_at=excluded.connected_at").bind(id,provider,isMailbox(provider)?a.id:null,accountId,mailboxEmail,a.id,at),db.prepare('INSERT INTO p_connection_secrets(connection_id,sealed) VALUES(?,?) ON CONFLICT(connection_id) DO UPDATE SET sealed=excluded.sealed').bind(id,sealed)],false,guard)
 return {id,status:'connected'}
}
