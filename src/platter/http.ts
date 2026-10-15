import { runtimeBindings,type Bindings } from '../auth.server'
import { principal,credentialCommand } from './credentials'
import { command } from './commands'
import { importCommand } from './movein'
import { state } from './state'
import { clientContext,clientView,clientCommand } from './signing'
import { renderApp,renderClient,renderMissing } from './ui'
import { need,fail,type Actor } from './model'
const headers={'cache-control':'no-store','x-content-type-options':'nosniff','referrer-policy':'no-referrer'}
const json=(v:unknown,status=200)=>Response.json(v,{status,headers})
const pages=new Set(['/app','/app/proposal','/app/clients','/app/import','/app/access'])
async function body(request:Request){const raw=await request.text();need(new TextEncoder().encode(raw).length<=150000,'Request too large',413);if(request.headers.get('content-type')?.includes('application/json')){let v;try{v=JSON.parse(raw)}catch{fail('Invalid JSON')}need(v&&typeof v==='object'&&!Array.isArray(v),'Expected an object');return v as Record<string,unknown>}need(request.headers.get('content-type')?.includes('application/x-www-form-urlencoded'),'Use JSON or a form',415);return Object.fromEntries(new URLSearchParams(raw))}
export async function platterResponse(request:Request,original:Bindings):Promise<Response|null>{const env=runtimeBindings(original),url=new URL(request.url),path=url.pathname,isClient=path.startsWith('/p/'),isAgent=path.startsWith('/api/platter/agent/');if(!isClient&&!path.startsWith('/api/platter/')&&path!=='/app'&&!path.startsWith('/app/'))return null
 let actor:Actor|undefined;const requestedBack=new URL(url.searchParams.get('returnTo')||'/app',env.AUTH_ORIGIN);const back=requestedBack.origin===env.AUTH_ORIGIN&&pages.has(requestedBack.pathname)?requestedBack.pathname+requestedBack.search:'/app';let context:any
 try{
  need(url.origin===env.AUTH_ORIGIN&&(!request.headers.has('host')||request.headers.get('host')===url.host),'Wrong application origin',403);need(['GET','POST'].includes(request.method),'Method not allowed',405)
  if(request.method==='POST'&&!isAgent)need(request.headers.get('origin')===env.AUTH_ORIGIN&&request.headers.get('sec-fetch-site')!=='cross-site','Cross-site request refused',403)
  if(isClient){const match=path.match(/^\/p\/([a-f0-9]{64})(\/action)?$/);need(match,'Invitation not found',404);context=await clientContext(env,match[1],request)
   if(request.method==='GET'&&!match[2])return renderClient(await clientView(env,context),match[1])
   if(request.method==='POST'&&match[2]){const result=await clientCommand(env,context,url.searchParams.get('name')??'',await body(request));const cookie=(result as any).cookie;const response=renderClient(await clientView(env,await clientContext(env,match[1],cookie?new Request(request.url,{headers:{cookie:cookie.split(';')[0]}}):request)),match[1],{message:(result as any).message??'Saved.'});if(cookie)response.headers.set('set-cookie',cookie);return response}
   fail('Not found',404)
  }
  actor=await principal(request,env,isAgent)
  if(request.method==='GET'){
   if(pages.has(path))return renderApp(await state(env,actor),path+url.search)
   if(path==='/api/platter/state'||path==='/api/platter/agent/context')return json(await state(env,actor))
   const file=path.match(/^\/api\/platter\/invoices\/([\w-]+)\.csv$/);if(file){need(actor.role==='owner','Only the owner downloads exports',403);const row=await env.DB.prepare('SELECT csv FROM p_invoices WHERE id=?').bind(file[1]).first<any>();need(row,'Export not found',404);return new Response(row.csv,{headers:{...headers,'content-type':'text/csv; charset=utf-8','content-disposition':'attachment; filename="platter-deposit.csv"'}})}
  }else if(['/app/action','/api/platter/command','/api/platter/agent/command'].includes(path)){
   const p=await body(request),name=path==='/app/action'?url.searchParams.get('name')??'':String(p.name??''),input=path==='/app/action'?p:p.input as Record<string,unknown>;need(input&&typeof input==='object'&&!Array.isArray(input),'Provide an input object')
   if(isAgent)need(['proposal.prepare','proposal.revise'].includes(name),'Agents only prepare proposal drafts',403)
   let result=name.startsWith('agent.')?await credentialCommand(env.DB,actor,name,input):name.startsWith('import.')?await importCommand(env.DB,actor,name,input):await command(env,actor,name,input)
   if(path==='/app/action'){if(['import.preview','import.apply'].includes(name))result={...result as any,csv:input.csv};const returnPath=back==='/app/proposal'?back+'?id='+encodeURIComponent(String(input.id??(result as any)?.id??'')):back;return renderApp(await state(env,actor),returnPath,{message:'Saved.',result})}
   return json(result)
  }
  return path.startsWith('/app')?renderMissing():json({error:'Not found'},404)
 }catch(error){const status=Number((error as any)?.status)||500;const message=status<500?(error as Error).message:'The change could not be completed. Reload and try again.';if(status>=500)console.error(error)
  if(isClient&&context&&status!==403){const r=renderClient(await clientView(env,context),context.token,{error:message});return new Response(r.body,{status,headers:r.headers})}
  if(path==='/app/action'&&actor)return renderApp(await state(env,actor),back,{error:message})
  if(pages.has(path)&&status===401)return new Response(null,{status:303,headers:{...headers,location:'/signin?returnTo='+encodeURIComponent(path+url.search)}})
  return json({error:message},status)
 }
}
