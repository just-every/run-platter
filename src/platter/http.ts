import { attachmentUpload } from './attachment-commands'
import { copyAttachments, downloadAttachment, vendorDocuments } from './attachments'
import { proposal, snapshot } from './model'
import { handleMcp } from './mcp'
import { sendRequests, resolveSendRequest } from './send-requests'
import { auditRows, auditCsv, recordAudit } from './audit'
import { auditPage } from './ui/audit'
import { document } from './ui/shared'
import { runtimeBindings,type Bindings } from '../auth.server'
import { principal,credentialCommand } from './credentials'
import { command } from './commands'
import { importCommand } from './movein'
import { state } from './state'
import { pipeline } from './pipeline'
import { clientContext,clientView,clientCommand } from './signing'
import { renderApp,renderClient,renderMissing } from './ui'
import { need,fail,type Actor } from './model'
const headers={'cache-control':'no-store','x-content-type-options':'nosniff','referrer-policy':'no-referrer'}
const json=(v:unknown,status=200)=>Response.json(v,{status,headers})
const pages=new Set(['/app','/app/proposal','/app/clients','/app/import','/app/access','/app/audit','/app/settings'])
async function body(request:Request){const raw=await request.text();need(new TextEncoder().encode(raw).length<=150000,'Request too large',413);if(request.headers.get('content-type')?.includes('application/json')){let v;try{v=JSON.parse(raw)}catch{fail('Invalid JSON')}need(v&&typeof v==='object'&&!Array.isArray(v),'Expected an object');return v as Record<string,unknown>}need(request.headers.get('content-type')?.includes('application/x-www-form-urlencoded'),'Use JSON or a form',415);return Object.fromEntries(new URLSearchParams(raw))}
export async function platterResponse(request:Request,original:Bindings):Promise<Response|null>{const env=runtimeBindings(original),url=new URL(request.url),path=url.pathname,isClient=path.startsWith('/p/'),isAgent=path.startsWith('/api/platter/agent/');if(!isClient&&!path.startsWith('/api/platter/')&&path!=='/app'&&!path.startsWith('/app/'))return null
 let actor:Actor|undefined;const requestedBack=new URL(url.searchParams.get('returnTo')||'/app',env.AUTH_ORIGIN);const back=requestedBack.origin===env.AUTH_ORIGIN&&pages.has(requestedBack.pathname)?requestedBack.pathname+requestedBack.search:'/app';let context:any
 try{
  need(url.origin===env.AUTH_ORIGIN&&(!request.headers.has('host')||request.headers.get('host')===url.host),'Wrong application origin',403);need(['GET','POST'].includes(request.method),'Method not allowed',405)
  if(request.method==='POST'&&!isAgent)need(request.headers.get('origin')===env.AUTH_ORIGIN&&request.headers.get('sec-fetch-site')!=='cross-site','Cross-site request refused',403)
  if(isClient){const match=path.match(/^\/p\/([a-f0-9]{64})(\/action|\/attachments\/([\w-]+))?$/);need(match,'Invitation not found',404);context=await clientContext(env,match[1],request)
   if(request.method==='GET'&&match[3]){const file=copyAttachments(snapshot(context.row).attachments).find(f=>f.id===match[3]);need(file,'Attachment not found',404);await recordAudit(env.DB,{id:context.verified?context.row.client_id:'unidentified',role:context.verified?'client':'invitation'},'attachment.download',context.row.id);return downloadAttachment(env.DB,file)}
   if(request.method==='GET'&&!match[2]){await recordAudit(env.DB,{id:context.verified?context.row.client_id:'unidentified',role:context.verified?'client':'invitation'},'proposal.view',context.row.id);return renderClient(await clientView(env,context),match[1])}
   if(request.method==='POST'&&match[2]==='/action'){const result=await clientCommand(env,context,url.searchParams.get('name')??'',await body(request));await recordAudit(env.DB,{id:context.verified?context.row.client_id:'unidentified',role:context.verified?'client':'invitation'},url.searchParams.get('name')==='accept'?'proposal.accept':String(url.searchParams.get('name')),context.row.id);const cookie=(result as any).cookie;const response=renderClient(await clientView(env,await clientContext(env,match[1],cookie?new Request(request.url,{headers:{cookie:cookie.split(';')[0]}}):request)),match[1],{message:(result as any).message??'Saved.'});if(cookie)response.headers.set('set-cookie',cookie);return response}
   fail('Not found',404)
  }
  actor=await principal(request,env,isAgent)
  if(path==='/api/platter/agent/mcp')return handleMcp(request,env,actor)
  if(request.method==='POST'&&path==='/app/attachment'){need(request.headers.get('content-type')?.includes('multipart/form-data'),'Use a file upload form',415);const data=await request.formData(),result=await attachmentUpload(env.DB,actor,data);await recordAudit(env.DB,actor,data.get('kind')?'vendor-document.save':'attachment.upload',String(result.id??data.get('kind')));return renderApp(await state(env,actor),result.id?'/app/proposal?id='+encodeURIComponent(result.id):'/app/settings',{message:result.id?'Document saved. Review the revision before approving.':'Document saved. Existing revisions retain their files.'})}
  if(request.method==='GET'){
   const attachment=path.match(/^\/api\/platter\/attachments\/([\w-]+)(?:\/([\w-]+))?$/);if(attachment){let files;if(attachment[2]){need(actor.role!=='agent','A person downloads proposal files',403);const row=await proposal(env.DB,attachment[1]);files=copyAttachments(snapshot(row).attachments)}else{need(actor.role==='owner','Only the owner reads vendor settings',403);files=await vendorDocuments(env.DB)}const file=files.find(f=>f.id===(attachment[2]??attachment[1]));need(file,'Attachment not found',404);await recordAudit(env.DB,actor,'attachment.download',file.id);return downloadAttachment(env.DB,file)}
   if(path==='/app/audit'||path==='/api/platter/audit'||path==='/api/platter/audit.csv'){const rows=await auditRows(env.DB,actor,url.searchParams);return path==='/app/audit'?document('Audit log',auditPage(rows,url.searchParams),{actor,path}):path.endsWith('.csv')?new Response(auditCsv(rows),{headers:{...headers,'content-type':'text/csv; charset=utf-8','content-disposition':'attachment; filename=platter-audit.csv'}}):json({rows})}
   if(pages.has(path)){if(path==='/app/proposal'){const id=url.searchParams.get('id');if(id&&(await env.DB.prepare('SELECT id FROM p_proposals WHERE id=?').bind(id).first()))await recordAudit(env.DB,actor,'proposal.view',id)}return renderApp(await state(env,actor),path+url.search)}
   if(path==='/api/platter/send-requests')return json({requests:await sendRequests(env.DB,actor)})
   if(path==='/api/platter/pipeline'){need(actor.role==='owner','Only the owner views the pipeline report',403);return json(pipeline((await state(env,actor)).proposals,url.searchParams))}
   if(path==='/api/platter/state'||path==='/api/platter/agent/context')return json(await state(env,actor))
   const file=path.match(/^\/api\/platter\/invoices\/([\w-]+)\.csv$/);if(file){need(actor.role==='owner','Only the owner downloads exports',403);const row=await env.DB.prepare('SELECT csv FROM p_invoices WHERE id=?').bind(file[1]).first<any>();need(row,'Export not found',404);await recordAudit(env.DB,actor,'invoice.download',file[1]);return new Response(row.csv,{headers:{...headers,'content-type':'text/csv; charset=utf-8','content-disposition':'attachment; filename="platter-deposit.csv"'}})}
  }else if(['/app/action','/api/platter/command','/api/platter/agent/command'].includes(path)){
   const p=await body(request),name=path==='/app/action'?url.searchParams.get('name')??'':String(p.name??''),input=path==='/app/action'?p:p.input as Record<string,unknown>;need(input&&typeof input==='object'&&!Array.isArray(input),'Provide an input object')
   if(isAgent)need(['proposal.prepare','proposal.revise'].includes(name),'Agents only prepare proposal drafts',403)
   let result=name==='send-request.resolve'?await resolveSendRequest(env.DB,actor,input):name.startsWith('agent.')?await credentialCommand(env.DB,actor,name,input):name.startsWith('import.')?await importCommand(env.DB,actor,name,input):await command(env,actor,name,input)
   const subject=String((result as any)?.job?.id??(result as any)?.id??input.id??'clients');await recordAudit(env.DB,actor,name,subject)
   if(path==='/app/action'){if(['import.preview','import.apply'].includes(name))result={...result as any,csv:input.csv};const returnPath=back==='/app/proposal'?back+'?id='+encodeURIComponent(String(input.id??(result as any)?.id??'')):back;return renderApp(await state(env,actor),returnPath,{message:'Saved.',result})}
   return json(result)
  }
  return path.startsWith('/app')?renderMissing():json({error:'Not found'},404)
 }catch(error){const status=Number((error as any)?.status)||500;const message=status<500?(error as Error).message:'The change could not be completed. Reload and try again.';if(status>=500)console.error(error)
  if(isClient&&context&&status!==403){const r=renderClient(await clientView(env,context),context.token,{error:message});return new Response(r.body,{status,headers:r.headers})}
  if(path==='/app/attachment'&&actor){const response=renderApp(await state(env,actor),back,{error:message});return new Response(response.body,{status,headers:response.headers})}
  if(path==='/app/action'&&actor)return renderApp(await state(env,actor),back,{error:message})
  if(pages.has(path)&&status===401)return new Response(null,{status:303,headers:{...headers,location:'/signin?returnTo='+encodeURIComponent(path+url.search)}})
  return json({error:message},status)
 }
}
