import { currentTime } from './expiry-time'
import { previewResponse } from './preview'
import { withdrawnPage } from './ui/withdrawal'
import { openQuestions } from './questions'
import { questionReplyResponse } from './question-replies'
import { clientPdf } from './documents/client-pdf'
import { businessOriginal, businessRecords } from './business-records'
import { deliveryWebhook } from './delivery'
import { attachmentUpload } from './attachment-commands'
import { paperAcceptance } from './paper-acceptance'
import { paperFile,paperRow } from './paper-record'
import { copyAttachments, downloadAttachment, vendorDocuments } from './attachments'
import { proposal, snapshot } from './model'
import { handleMcp } from './mcp'
import { sendRequests, resolveSendRequest } from './send-requests'
import { auditNames, auditRows, auditCsv, recordAudit } from './audit'
import { auditPage } from './ui/audit'
import { document } from './ui/shell'
import { inZone } from './ui/shared'
import { installationZone } from './reports/report-state'
import { runtimeBindings,type Bindings } from '../auth.server'
import { principal,credentialCommand } from './credentials'
import { command } from './commands'
import { importCommand } from './movein'
import { state } from './state'
import { pipeline } from './pipeline'
import { pipelineCsv } from './reports/pipeline-csv'
import { clientContext,clientView,clientCommand } from './signing'
import { renderApp,renderClient,renderMissing } from './ui'
import { need,fail,type Actor } from './model'
const headers={'cache-control':'no-store','x-content-type-options':'nosniff','referrer-policy':'no-referrer'}
const json=(v:unknown,status=200)=>Response.json(v,{status,headers})
const pages=new Set(['/app','/app/proposal','/app/clients','/app/import','/app/access','/app/audit','/app/settings'])
async function body(request:Request,maxBytes=150000){const raw=await request.text();need(new TextEncoder().encode(raw).length<=maxBytes,'Request too large',413);if(request.headers.get('content-type')?.includes('application/json')){let v;try{v=JSON.parse(raw)}catch{fail('Invalid JSON')}need(v&&typeof v==='object'&&!Array.isArray(v),'Expected an object');return v as Record<string,unknown>}need(request.headers.get('content-type')?.includes('application/x-www-form-urlencoded'),'Use JSON or a form',415);return Object.fromEntries(new URLSearchParams(raw))}
export async function platterResponse(request:Request,original:Bindings):Promise<Response|null>{const env=runtimeBindings(original),url=new URL(request.url),path=url.pathname,isClient=path.startsWith('/p/'),isAgent=path.startsWith('/api/platter/agent/');if(!isClient&&!path.startsWith('/api/platter/')&&path!=='/app'&&!path.startsWith('/app/'))return null
 let actor:Actor|undefined;const requestedBack=new URL(url.searchParams.get('returnTo')||'/app',env.AUTH_ORIGIN);const back=requestedBack.origin===env.AUTH_ORIGIN&&pages.has(requestedBack.pathname)?requestedBack.pathname+requestedBack.search:'/app';let context:any,submitted:Record<string,unknown>|undefined
 try{
  need(url.origin===env.AUTH_ORIGIN&&(!request.headers.has('host')||request.headers.get('host')===url.host),'Wrong application origin',403);need(['GET','POST'].includes(request.method),'Method not allowed',405)
  if(path==='/api/platter/question-replies')return await questionReplyResponse(request,env)
  if(path==='/api/platter/mail/events')return await deliveryWebhook(request,env)
  if(request.method==='POST'&&!isAgent)need(request.headers.get('origin')===env.AUTH_ORIGIN&&request.headers.get('sec-fetch-site')!=='cross-site','Cross-site request refused',403)
  if(isClient){const match=path.match(/^\/p\/([a-f0-9]{64})(\/action|\/download\.pdf|\/attachments\/([\w-]+))?$/);need(match,'Invitation not found',404);const withdrawn=await env.DB.prepare('SELECT contact_email FROM p_withdrawn_links WHERE token=?').bind(match[1]).first<{contact_email:string}>();if(withdrawn)return withdrawnPage(withdrawn.contact_email);context=await clientContext(env,match[1],request)
   if(match[2]==='/download.pdf'){const input=request.method==='POST'?await body(request):Object.fromEntries(url.searchParams);return await clientPdf(env,context,String(input.optionId??''))}
   if(request.method==='GET'&&match[3]){const file=copyAttachments(snapshot(context.row).attachments).find(f=>f.id===match[3]);need(file,'Attachment not found',404);await recordAudit(env.DB,{id:context.verified?context.row.client_id:'unidentified',role:context.verified?'client':'invitation'},'attachment.download',context.row.id);return downloadAttachment(env.DB,file)}
   if(request.method==='GET'&&!match[2]){await recordAudit(env.DB,{id:context.verified?context.row.client_id:'unidentified',role:context.verified?'client':'invitation'},'proposal.view',context.row.id);return renderClient(await clientView(env,context),match[1])}
   if(request.method==='POST'&&match[2]==='/action'){const result=await clientCommand(env,context,url.searchParams.get('name')??'',await body(request));if(url.searchParams.get('name')!=='question.create')await recordAudit(env.DB,{id:context.verified?context.row.client_id:'unidentified',role:context.verified?'client':'invitation'},url.searchParams.get('name')==='accept'?'proposal.accept':String(url.searchParams.get('name')),context.row.id);const cookie=(result as any).cookie;const response=renderClient(await clientView(env,await clientContext(env,match[1],cookie?new Request(request.url,{headers:{cookie:cookie.split(';')[0]}}):request)),match[1],{message:(result as any).message??'Saved.'});if(cookie)response.headers.set('set-cookie',cookie);return response}
   fail('Not found',404)
  }
  actor=await principal(request,env,isAgent)
  if(path==='/app/preview'||path.startsWith('/app/preview/')){const response=await previewResponse(request,env);await recordAudit(env.DB,actor,path.startsWith('/app/preview/client/attachments/')?'attachment.download':'proposal.preview',path.startsWith('/app/preview/client/attachments/')?path.split('/').at(-1)!:String(url.searchParams.get('id')));return response}
  if(path==='/api/platter/agent/mcp')return handleMcp(request,env,actor)
  if(request.method==='POST'&&path==='/app/attachment'){need(request.headers.get('content-type')?.includes('multipart/form-data'),'Use a file upload form',415);const data=await request.formData(),result=await attachmentUpload(env.DB,actor,data);await recordAudit(env.DB,actor,data.get('kind')?'vendor-document.save':'attachment.upload',String(result.id??data.get('kind')));return renderApp(await state(env,actor),result.id?'/app/proposal?id='+encodeURIComponent(result.id):'/app/settings',{message:result.id?'Document saved. Review the revision before approving.':'Document saved. Existing revisions retain their files.'})}
  if(request.method==='POST'&&path==='/app/paper-acceptance'){need(request.headers.get('content-type')?.includes('multipart/form-data'),'Use a file upload form',415);const result=await paperAcceptance(env.DB,actor,await request.formData());await recordAudit(env.DB,actor,'acceptance.upload',result.id);return renderApp(await state(env,actor),'/app/proposal?id='+encodeURIComponent(result.id),{message:'Accepted by upload. The deposit invoice is ready to export.'})}
  if(request.method==='GET'){
   if(path==='/api/platter/business-original')return await businessOriginal(env,actor,url.searchParams)
   if(path==='/api/platter/business-records'){need(actor.role==='owner','Only the owner reads imported business records',403);return json(await businessRecords(env.DB,actor))}
   const attachment=path.match(/^\/api\/platter\/attachments\/([\w-]+)(?:\/([\w-]+))?$/);if(attachment){let files;if(attachment[2]){need(actor.role!=='agent','A person downloads proposal files',403);const row=await proposal(env.DB,attachment[1]),paper=await paperRow(env.DB,row.id);files=[...copyAttachments(snapshot(row).attachments),...(paper?[paperFile(paper)]:[])]}else{need(actor.role==='owner','Only the owner reads vendor settings',403);files=await vendorDocuments(env.DB)}const file=files.find(f=>f.id===(attachment[2]??attachment[1]));need(file,'Attachment not found',404);await recordAudit(env.DB,actor,'attachment.download',file.id);return downloadAttachment(env.DB,file)}
   if(path==='/app/audit'||path==='/api/platter/audit'||path==='/api/platter/audit.csv'){const rows=await auditRows(env.DB,actor,url.searchParams);if(path==='/app/audit'){const zone=await installationZone(env.DB),person=await env.DB.prepare('SELECT display_name FROM oa_operators WHERE id=?').bind(actor.id).first<{display_name:string}>();const names=await auditNames(env.DB);return document('Audit log',inZone(zone,()=>auditPage(rows,url.searchParams,names)),{actor,path,zone,name:person?.display_name,eyebrow:'<p class="eyebrow">Audit · who did what, and when</p>'})}return path.endsWith('.csv')?new Response(auditCsv(rows),{headers:{...headers,'content-type':'text/csv; charset=utf-8','content-disposition':'attachment; filename=platter-audit.csv'}}):json({rows})}
   if(pages.has(path)){if(path==='/app/proposal'){const id=url.searchParams.get('id');if(id&&(await env.DB.prepare('SELECT id FROM p_proposals WHERE id=?').bind(id).first()))await recordAudit(env.DB,actor,'proposal.view',id)}return renderApp(await state(env,actor),path+url.search)}
   if(path==='/api/platter/followups'){need(actor.role==='owner','Only the owner views sales follow-ups',403);const queue=(await state(env,actor)).followups!;const owner=url.searchParams.get('owner');const rows=queue.rows.filter(r=>!owner||(r.ownerId||'unrecorded')===owner);return json({...queue,rows,count:rows.length,totals:queue.totals.map(t=>({...t,count:rows.filter(r=>r.currency===t.currency).length,valueCents:rows.filter(r=>r.currency===t.currency).reduce((n,r)=>n+r.valueCents,0)})).filter(t=>t.count)})}
   if(path==='/api/platter/questions')return json({questions:await openQuestions(env.DB,actor)})
   if(path==='/api/platter/send-requests')return json({requests:await sendRequests(env.DB,actor)})
   if(path==='/api/platter/pipeline.csv'){need(actor.role==='owner','Only the owner exports the pipeline report',403);const s=await state(env,actor),csv=pipelineCsv(pipeline(s.proposals,url.searchParams,await currentTime(env.DB),s.followups));await recordAudit(env.DB,actor,'report.export','pipeline');return new Response(csv,{headers:{...headers,'content-type':'text/csv; charset=utf-8','content-disposition':'attachment; filename="platter-pipeline.csv"'}})}
   if(path==='/api/platter/pipeline'){need(actor.role==='owner','Only the owner views the pipeline report',403);const s=await state(env,actor);return json(pipeline(s.proposals,url.searchParams,await currentTime(env.DB),s.followups))}
   if(path==='/api/platter/state'||path==='/api/platter/agent/context')return json(await state(env,actor))
   const file=path.match(/^\/api\/platter\/invoices\/([\w-]+)\.csv$/);if(file){need(actor.role==='owner','Only the owner downloads exports',403);const row=await env.DB.prepare('SELECT csv FROM p_invoices WHERE id=?').bind(file[1]).first<any>();need(row,'Export not found',404);await recordAudit(env.DB,actor,'invoice.download',file[1]);return new Response(row.csv,{headers:{...headers,'content-type':'text/csv; charset=utf-8','content-disposition':'attachment; filename="platter-deposit.csv"'}})}
  }else if(['/app/action','/api/platter/command','/api/platter/agent/command'].includes(path)){
   const p=await body(request,path==='/app/action'&&url.searchParams.get('name')?.startsWith('business-import.')?6_200_000:150000),name=path==='/app/action'?url.searchParams.get('name')??'':String(p.name??''),input=path==='/app/action'?p:p.input as Record<string,unknown>;need(input&&typeof input==='object'&&!Array.isArray(input),'Provide an input object');submitted=input
   if(isAgent)need(['proposal.prepare','proposal.revise'].includes(name),'Agents only prepare proposal drafts',403)
   let result=name==='send-request.resolve'?await resolveSendRequest(env.DB,actor,input):name.startsWith('agent.')?await credentialCommand(env.DB,actor,name,input):name.startsWith('import.')?await importCommand(env.DB,actor,name,input):await command(env,actor,name,input)
   const subject=String((result as any)?.job?.id??(result as any)?.id??input.id??'clients');if(!name.startsWith('question.')&&name!=='proposal.withdraw')await recordAudit(env.DB,actor,name,subject)
   if(path==='/app/action'){if(name==='proposal.duplicate')return new Response(null,{status:303,headers:{...headers,location:'/app/proposal?id='+encodeURIComponent(String((result as any).id))}});if(name.startsWith('business-import.'))result={...result as any,businessInput:input};if(['import.preview','import.apply'].includes(name))result={...result as any,csv:input.csv};const returnPath=back==='/app/proposal'?back+'?id='+encodeURIComponent(String(input.id??(result as any)?.id??'')):back;return renderApp(await state(env,actor),returnPath,{message:'Saved.',result})}
   return json(result)
  }
  return path.startsWith('/app')?renderMissing():json({error:'Not found'},404)
 }catch(error){const status=Number((error as any)?.status)||500;const message=status<500?(error as Error).message:'The change could not be completed. Reload and try again.';if(status>=500)console.error(error)
  if(isClient&&context&&status!==403){const r=renderClient(await clientView(env,context),context.token,{error:message});return new Response(r.body,{status,headers:r.headers})}
  if((path==='/app/attachment'||path==='/app/paper-acceptance')&&actor){const response=renderApp(await state(env,actor),back,{error:message});return new Response(response.body,{status,headers:response.headers})}
  if(path==='/app/action'&&actor)return renderApp(await state(env,actor),back,{error:message,status,field:(error as any)?.field,command:url.searchParams.get('name')??undefined,input:submitted})
  if(pages.has(path)&&status===401)return new Response(null,{status:303,headers:{...headers,location:'/signin?returnTo='+encodeURIComponent(path+url.search)}})
  return json({error:message},status)
 }
}
