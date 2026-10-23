import { agentAction } from '../agents/activity'
import type { Bindings } from '../../auth.server'
import { apiPrincipal, apiScopes } from '../credentials'
import { command } from '../commands'
import { recordAudit } from '../audit'
import { need, type Actor } from '../model'
import { starterTemplates } from '../starter-templates'
import { templateState } from '../templates'
import { document } from '../ui/shell'
import { escape } from '../ui/shared'

const headers = { 'cache-control': 'no-store', 'x-content-type-options': 'nosniff', 'referrer-policy': 'no-referrer' }
const json = (value:unknown,status=200) => Response.json(value,{status,headers})
const string = {type:'string'}
const integer = {type:'integer',minimum:1}
const object = (properties:Record<string,unknown>,required=Object.keys(properties)) => ({type:'object',properties,required,additionalProperties:false})
const pageSchema = (row:unknown) => object({items:{type:'array',items:row},next:{type:['string','null']}})
const proposalSchema = object({id:string,title:string,status:string,revision:integer,version:integer,currency:string})
const templateSchema = object({id:string,name:string,version:integer})
const agreementSchema = object({proposalId:string,revision:integer,currency:string,totalCents:{type:'integer'},depositCents:{type:'integer'},acceptedAt:{type:'integer'}})
const createSchema = object({templateId:{...string,minLength:1,maxLength:200},templateVersion:integer,clientId:{...string,minLength:1,maxLength:200},title:{...string,minLength:1,maxLength:200}},['templateId','templateVersion','clientId'])
const errorSchema = object({error:string})
type Route = {method:'GET'|'POST';path:string;scope:string;summary:string;response:unknown;request?:unknown;paginated?:boolean;run:(env:Bindings,actor:Actor,input:Record<string,unknown>,url:URL)=>Promise<unknown>}
function page(items:any[]){return {items:items.slice(0,100),next:items.length>100?items[99].id:null}}
function after(url:URL){const value=url.searchParams.get('after')??'';need(value.length<=200,'Invalid page cursor');need([...url.searchParams.keys()].every(k=>k==='after'),'Unknown query parameter');return value}

// This registry dispatches and documents the scoped API. Session commands and
// invitation routes retain their existing authentication and are not in v1.
export const apiRoutes:Route[] = [
 {method:'GET',path:'/api/platter/v1/templates',scope:'templates.read',summary:'List available template identifiers and versions',response:pageSchema(templateSchema),paginated:true,
  async run(env,a,_input,url){const cursor=after(url);const rows=[...starterTemplates(),...await templateState(env.DB,a)].map(t=>({id:t.id,name:t.name,version:t.version})).filter(t=>t.id>cursor).sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0);return page(rows)}},
 {method:'POST',path:'/api/platter/v1/proposals',scope:'proposals.write',summary:'Prepare an independent template draft for human review',request:createSchema,response:object({id:string,revision:integer,version:integer}),
  async run(env,a,input){
   need(Object.keys(input).every(k=>['templateId','templateVersion','clientId','title'].includes(k)),'Unknown draft field')
   need(typeof input.templateId==='string'&&input.templateId.length>0&&input.templateId.length<=200&&typeof input.clientId==='string'&&input.clientId.length>0&&input.clientId.length<=200&&Number.isSafeInteger(input.templateVersion)&&Number(input.templateVersion)>0,'Provide templateId, templateVersion and clientId')
   if(input.title!==undefined)need(typeof input.title==='string'&&input.title.trim().length>0&&input.title.length<=200,'Provide a title up to 200 characters')
   return command(env,a,'proposal.prepare',input)
  }},
 {method:'GET',path:'/api/platter/v1/proposals',scope:'proposals.read',summary:'Read proposal status and revision identifiers',response:pageSchema(proposalSchema),paginated:true,
  async run(env,_a,_input,url){const rows=(await env.DB.prepare(`SELECT p.id,p.title,CASE WHEN EXISTS(SELECT 1 FROM p_withdrawals w WHERE w.proposal_id=p.id AND w.revision=p.revision) THEN 'withdrawn' ELSE p.status END AS status,p.revision,p.version,p.currency FROM p_proposals p WHERE p.id>? ORDER BY p.id LIMIT 101`).bind(after(url)).all<any>()).results;return page(rows)}},
 {method:'GET',path:'/api/platter/v1/agreements',scope:'agreements.read',summary:'List accepted agreement amounts without signer or invitation credentials',response:pageSchema(agreementSchema),paginated:true,
  async run(env,_a,_input,url){const rows=(await env.DB.prepare('SELECT proposal_id AS id,revision,currency,total_cents AS totalCents,deposit_cents AS depositCents,accepted_at AS acceptedAt FROM p_acceptances WHERE proposal_id>? ORDER BY proposal_id LIMIT 101').bind(after(url)).all<any>()).results;const result=page(rows);return {...result,items:result.items.map(({id,...row})=>({proposalId:id,...row}))}}},
]
const documents = [
 {method:'GET',path:'/api/platter/openapi.json',scope:'public',summary:'Read the scoped API OpenAPI description'},
 {method:'GET',path:'/api/platter/reference',scope:'public',summary:'Read the scoped API reference'},
] as const
export function openApi(){
 const paths:Record<string,any>={}
 for(const route of [...apiRoutes,...documents]){
  const operation:any={summary:route.summary,'x-required-scope':route.scope,security:route.scope==='public'?[]:[{scopedKey:[]}],responses:{'200':{description:'Successful response',content:{['path' in route&&route.path.endsWith('/reference')?'text/html':'application/json']:{schema:'response' in route?route.response:{type:route.path.endsWith('.json')?'object':'string'}}}},'400':{description:'Invalid input',content:{'application/json':{schema:errorSchema}}},'401':{description:'Missing, expired or revoked key',content:{'application/json':{schema:errorSchema}}},'403':{description:'Insufficient scope',content:{'application/json':{schema:errorSchema}}},'423':{description:'The owner paused this key',content:{'application/json':{schema:errorSchema}}},'409':{description:'Template or authority changed; reload before retrying',content:{'application/json':{schema:errorSchema}}}}}
  if('request' in route&&route.request)operation.requestBody={required:true,content:{'application/json':{schema:route.request}}}
  if('paginated' in route&&route.paginated)operation.parameters=[{in:'query',name:'after',description:'Use the previous response next value; omit on the first page.',schema:{type:'string',maxLength:200}}]
  ;(paths[route.path]??={})[route.method.toLowerCase()]=operation
 }
 return {openapi:'3.1.0',info:{title:'Platter scoped API',version:'1.0.0',description:'Draft preparation and selected read projections. Keys cannot approve, send, sign or refund. No lifecycle webhooks are emitted by this API yet.'},paths,components:{securitySchemes:{scopedKey:{type:'http',scheme:'bearer',description:'Owner-issued key with the exact scope named in x-required-scope. Scopes are immutable; keys expire after 30 days and may be revoked.'}}},'x-available-scopes':apiScopes,'x-webhook-events':[]}
}
function reference(){
 return document('API reference',`<section><h2>Scoped drafts and reads</h2><p>Use an owner-issued bearer key with the scope named for each route. Keys expire after 30 days. Human review and approval remain required; these keys cannot approve, send, sign or refund.</p><p><a href="/api/platter/openapi.json">Download OpenAPI description</a></p></section><section><h2>Manage keys</h2><p>The signed-in owner uses the existing command endpoint <code>/api/platter/command</code> with <code>api.key.create</code>, a label and an explicit scopes array. The response shows the token once. Send it in the Authorization header as a Bearer credential. Never put it in a URL.</p><p>Use <code>api.key.list</code> to inspect scopes and expiry without secrets, or <code>api.key.revoke</code> with the key id to stop access immediately. The owner can temporarily pause a key with <code>agent.pause</code>, its id and a paused boolean; paused keys return 423. These commands require an owner session and the installation Origin header. A scoped key cannot manage keys or use the older agent doors.</p></section>${apiRoutes.map(r=>`<section><h2>${escape(r.summary)}</h2><p><strong>${r.method}</strong> <code>${escape(r.path)}</code></p><p>Required scope: <code>${escape(r.scope)}</code>.</p>${r.paginated?'<p>Responses contain up to 100 items. Pass the returned next value as after to continue; a null next value ends the list.</p>':'<p>Provide templateId, templateVersion and clientId; title is optional. Use identifiers already available to the owner. The returned id identifies a new draft. Client and sender details in built-in starters are filled by the server. General variables are not supported.</p>'}</section>`).join('')}<section><h2>Current boundaries</h2><p>This reference covers the versioned scoped API. Existing session, invitation and MCP doors keep their own authorization. General variables, analytics, payment reads and signed lifecycle webhooks are still pending. No webhook event types are emitted here.</p><p>Missing or revoked credentials return 401; missing scopes return 403; a stale template version returns 409. Refused requests create no proposal or audit event. Successful reads and drafts are audited with the key id, action and subject; credentials and input payloads are omitted.</p></section>`)
}
export async function publicApiResponse(request:Request,env:Bindings):Promise<Response|null>{
 const url=new URL(request.url),path=url.pathname
 if(!path.startsWith('/api/platter/v1/')&&!documents.some(r=>r.path===path))return null
 if(request.headers.has('origin'))need(request.headers.get('origin')===env.AUTH_ORIGIN&&request.headers.get('sec-fetch-site')!=='cross-site','Cross-site request refused',403)
 if(documents.some(r=>r.path===path)){need(request.method==='GET','Method not allowed',405);return path.endsWith('.json')?json(openApi()):reference()}
 const registered=apiRoutes.filter(r=>r.path===path);need(registered.length,'API route not found',404)
 const route=registered.find(r=>r.method===request.method);need(route,'Method not allowed',405)
 const actor=await apiPrincipal(request,env,route.scope)
 let input:Record<string,unknown>={}
 if(request.method==='POST'){
  need(request.headers.get('content-type')?.split(';')[0].trim()==='application/json','Use application/json',415)
  const raw=await request.text();need(new TextEncoder().encode(raw).length<=150000,'Request too large',413)
  let value;try{value=JSON.parse(raw)}catch{need(false,'Invalid JSON')}
  need(value&&typeof value==='object'&&!Array.isArray(value),'Provide an input object');input=value
 }
 const value=await agentAction(env,actor,'api.'+route.scope,input,()=>route.run(env,actor,input,url))
 await recordAudit(env.DB,actor,'api.'+route.scope,String((value as any)?.id??route.scope))
 return json(value)
}
