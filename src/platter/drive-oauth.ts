import type { Bindings } from '../auth.server'
import { administrators } from './permissions'
import { commit, hash, need, secret, text, type Actor } from './model'
import { currentConnection, openCredential, sealCredential, rejectCredential, type ProviderCredential } from './connections'

const id='workspace:google_drive',scope='https://www.googleapis.com/auth/drive.file'
const tokenUrl='https://oauth2.googleapis.com/token'
const encoded=(bytes:Uint8Array)=>btoa(Array.from(bytes,c=>String.fromCharCode(c)).join('')).replaceAll('+','-').replaceAll('/','_').replaceAll('=','')
function config(env:Bindings){
 need(env.GOOGLE_DRIVE_CLIENT_ID&&env.GOOGLE_DRIVE_CLIENT_SECRET,'The owner must configure the Google Drive OAuth application before authorizing it',503)
 return {clientId:env.GOOGLE_DRIVE_CLIENT_ID,clientSecret:env.GOOGLE_DRIVE_CLIENT_SECRET,redirect:env.AUTH_ORIGIN+'/api/platter/drive/callback'}
}
function granted(value:unknown){
 need(typeof value==='string','Google did not confirm the Drive permissions',409)
 const scopes=value.split(/\s+/)
 need(scopes.includes(scope)&&scopes.every(s=>s===scope),'Authorize only app-selected Drive files and folders',409)
 return value
}
async function grant(env:Bindings,input:Record<string,string>,credential?:ProviderCredential){
 const c=config(env)
 if(credential)await currentConnection(env,credential)
 let r:Response
 try{r=await fetch(tokenUrl,{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:c.clientId,client_secret:c.clientSecret,...input}),redirect:'manual',signal:AbortSignal.timeout(15000)})}
 catch{need(false,'Google Drive authorization is unavailable. Existing archive work stays held for review.',409)}
 const raw=await r!.text();need(raw.length<=32768,'Google returned an oversized authorization response',409)
 let value:any;try{value=JSON.parse(raw)}catch{need(false,'Google returned an invalid authorization response',409)}
 if(!r!.ok&&credential&&['invalid_grant','invalid_token','insufficient_scope'].includes(value?.error))await rejectCredential(env,credential)
 need(r!.ok,'Google Drive authorization is unavailable. Existing archive work stays held for review.',409)
 const token=text(value?.access_token,'a Google Drive access grant',8192);need(!/[\r\n\0]/.test(token),'Google returned an invalid access grant',409)
 need(typeof value.token_type==='string'&&value.token_type.toLowerCase()==='bearer','Google returned an unsupported access grant',409)
 return {...value,access_token:token}
}
export async function driveAuthorize(env:Bindings,a:Actor,p:Record<string,unknown>){
 need(administrators.includes(a.role),'Only owner and admins authorize Google Drive',403)
 need(p.consent===true||p.consent==='yes','Explicitly authorize app-selected Drive files and folders')
 const c=config(env),state=secret(),digest=await hash(state),verifier=secret()
 const connection=await env.DB.prepare('SELECT version FROM p_connections WHERE id=?').bind(id).first<any>()
 const operator=await env.DB.prepare('SELECT version FROM oa_operators WHERE id=?').bind(a.id).first<any>()
 await commit(env.DB,a,[env.DB.prepare('DELETE FROM p_drive_oauth WHERE operator_id=?').bind(a.id),env.DB.prepare('INSERT INTO p_drive_oauth(state_hash,operator_id,operator_version,member_version,connection_version,sealed,expires_at) VALUES(?,?,?,?,?,?,?)').bind(digest,a.id,operator.version,a.memberVersion??0,connection?.version??0,await sealCredential(env,'drive-oauth:'+digest,{verifier}),Date.now()+600000)])
 const url=new URL('https://accounts.google.com/o/oauth2/v2/auth')
 url.search=new URLSearchParams({client_id:c.clientId,redirect_uri:c.redirect,response_type:'code',scope,state,code_challenge:encoded(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(verifier)))),code_challenge_method:'S256',access_type:'offline',prompt:'consent'}).toString()
 return {url:url.href}
}
export async function driveCallback(env:Bindings,a:Actor,url:URL){
 need(administrators.includes(a.role),'Only owner and admins authorize Google Drive',403)
 const digest=await hash(text(url.searchParams.get('state'),'the authorization state',200))
 const g=await env.DB.prepare('UPDATE p_drive_oauth SET consumed_at=? WHERE state_hash=? AND operator_id=? AND expires_at>? AND consumed_at IS NULL RETURNING *').bind(Date.now(),digest,a.id,Date.now()).first<any>()
 need(g,'This Drive authorization has expired or was already used',403)
 need(g.member_version===(a.memberVersion??0)&&await env.DB.prepare('SELECT 1 FROM oa_operators WHERE id=? AND version=?').bind(a.id,g.operator_version).first(),'Drive authorization changed. Start again.',403)
 need(((await env.DB.prepare('SELECT version FROM p_connections WHERE id=?').bind(id).first<any>())?.version??0)===g.connection_version,'The Drive connection changed. Start authorization again.',409)
 need(!url.searchParams.has('error'),'Google did not authorize this connection',403)
 const saved=await openCredential(env,'drive-oauth:'+digest,g.sealed),c=config(env)
 const value=await grant(env,{grant_type:'authorization_code',code:text(url.searchParams.get('code'),'the authorization code',8192),redirect_uri:c.redirect,code_verifier:saved.verifier})
 const grantedScope=granted(value.scope),refreshToken=text(value.refresh_token,'a renewable Google Drive grant',8192);need(!/[\r\n\0]/.test(refreshToken),'Google returned an invalid renewable grant',409)
 // Only the verified provider account is retained; mailbox and profile data are not copied.
 let response:Response
 try{response=await fetch('https://www.googleapis.com/drive/v3/about?fields=user(permissionId)',{headers:{authorization:'Bearer '+value.access_token},redirect:'manual',signal:AbortSignal.timeout(15000)})}
 catch{need(false,'Google did not confirm this Drive account',409)}
 need(response!.ok,'Google did not confirm this Drive account',409)
 const raw=await response!.text();need(raw.length<=32768,'Google returned an oversized account response',409)
 let account:any;try{account=JSON.parse(raw)}catch{need(false,'Google returned an invalid account response',409)}
 const accountId=text(account?.user?.permissionId,'the verified Drive account',200)
 const sealed=await sealCredential(env,id,{provider:'google_drive',accountId,token:value.access_token,refreshToken,scope:grantedScope,oauth:true})
 await commit(env.DB,a,[env.DB.prepare("INSERT INTO p_connections(id,provider,operator_id,account_id,status,connected_by,connected_at) VALUES(?,'google_drive',NULL,?,'connected',?,?) ON CONFLICT(id) DO UPDATE SET account_id=excluded.account_id,status='connected',broken_at=NULL,version=p_connections.version+1,connected_by=excluded.connected_by,connected_at=excluded.connected_at").bind(id,accountId,a.id,Date.now()),env.DB.prepare('INSERT INTO p_connection_secrets(connection_id,sealed) VALUES(?,?) ON CONFLICT(connection_id) DO UPDATE SET sealed=excluded.sealed').bind(id,sealed)],false,{sql:'COALESCE((SELECT version FROM p_connections WHERE id=?),0)=? AND EXISTS(SELECT 1 FROM oa_operators WHERE id=? AND version=?)',values:[id,g.connection_version,a.id,g.operator_version]})
 return id
}
export async function refreshDrive(env:Bindings,credential:ProviderCredential){
 const value=await grant(env,{grant_type:'refresh_token',refresh_token:credential.secret.refreshToken},credential)
 let scope:string
 try{scope=granted(value.scope??credential.secret.scope)}catch{await rejectCredential(env,credential);throw Error('unreachable')}
 const refreshToken=value.refresh_token===undefined?credential.secret.refreshToken:text(value.refresh_token,'a renewable Google Drive grant',8192)
 need(!/[\r\n\0]/.test(refreshToken),'Google returned an invalid renewable grant',409)
 const sealed=await sealCredential(env,id,{...credential.secret,token:value.access_token,refreshToken,scope})
 await env.DB.batch([
  env.DB.prepare("INSERT INTO p_guard(ok) VALUES(EXISTS(SELECT 1 FROM p_connections c JOIN p_connection_secrets s ON s.connection_id=c.id WHERE c.id=? AND c.version=? AND c.status='connected' AND c.broken_at IS NULL AND s.sealed=?))").bind(id,credential.connection.version,credential.connection.sealed),
  env.DB.prepare('UPDATE p_connection_secrets SET sealed=? WHERE connection_id=?').bind(sealed,id),env.DB.prepare('DELETE FROM p_guard'),
 ])
 return {connection:{...credential.connection,sealed},secret:{...credential.secret,token:value.access_token,refreshToken,scope}}
}
