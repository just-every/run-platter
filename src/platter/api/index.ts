import { citeAgentSource, type AgentSource } from '../agent-sources'
import { fillVariables } from './variables'
import { currentTime } from '../expiry-time'
import type { Bindings } from '../../auth.server'
import { principal } from '../credentials'
import { commit,hash,need,secret,text,type Actor } from '../model'
import { command } from '../commands'
import { templateState } from '../templates'
import { recordAudit } from '../audit'
import { document } from '../ui/shell'
import { escape } from '../ui/shared'
import { scopes,eventTypes,eventSchema,eventExample } from './schema'
import { webhookCreate,webhookRevoke,webhookState } from './webhooks'
const prefix='/api/platter/v1'
const json=(value:unknown,status=200)=>Response.json(value,{status,headers:{'cache-control':'no-store','x-content-type-options':'nosniff'}})
type Context={env:Bindings,actor:Actor,p:Record<string,unknown>,id:string}
type Route={method:'GET'|'POST',path:string,scope:string,summary:string,handle:(c:Context)=>Promise<unknown>}
async function keys(env:Bindings,a:Actor,p:Record<string,unknown>){
 need(Array.isArray(p.scopes)&&p.scopes.length>0&&new Set(p.scopes).size===p.scopes.length&&p.scopes.every(v=>scopes.includes(v as any)),'Choose distinct supported scopes')
 const id=crypto.randomUUID(),token='platter_rest_'+secret(),at=Date.now(),expiresAt=at+30*86400000
 await commit(env.DB,a,[env.DB.prepare("INSERT INTO p_agent_keys(id,owner_id,owner_version,label,token_hash,created_at,expires_at) SELECT ?,id,version,?,?,?,? FROM oa_operators WHERE id=? AND role='owner' AND status='active'").bind(id,text(p.label,'a key label',80),await hash(token),at,expiresAt,a.id),env.DB.prepare('INSERT INTO p_rest_keys VALUES(?,?)').bind(id,JSON.stringify(p.scopes))],true)
 await recordAudit(env.DB,a,'api-key.create',id);return {id,token,scopes:p.scopes,expiresAt}
}
// Withdrawal and expiry are retained separately from the frozen offer.
const proposalQuery=`SELECT p.id,p.title,p.revision,p.version,
 CASE WHEN EXISTS(SELECT 1 FROM p_withdrawals w WHERE w.proposal_id=p.id AND w.revision=p.revision) THEN 'withdrawn'
 WHEN p.status='sent' AND EXISTS(SELECT 1 FROM p_expiry ex WHERE ex.proposal_id=p.id AND ex.deadline_at<=?) THEN 'expired'
 ELSE p.status END AS status,p.currency FROM p_proposals p`
async function proposals(env:Bindings,actor:Actor){
 const rows=(await env.DB.prepare(proposalQuery+' ORDER BY p.created_at,p.id').bind(await currentTime(env.DB)).all<any>()).results
 for(const row of rows)await citeAgentSource(actor,'proposal',row.id,row.revision,row)
 return rows
}
async function analytics(env:Bindings,actor:Actor){
 // Counts and their proposal citations come from the same read snapshot.
 const rows=await proposals(env,actor),counts=new Map<string,number>()
 for(const row of rows)counts.set(row.status,(counts.get(row.status)??0)+1)
 return [...counts].sort(([a],[b])=>a<b?-1:a>b?1:0).map(([status,count])=>({status,count}))
}
export const routes:Route[]=[
 {method:'GET',path:'/openapi.json',scope:'public',summary:'OpenAPI description',handle:async()=>description()},
 {method:'GET',path:'/reference',scope:'public',summary:'API reference',handle:async()=>null},
 {method:'POST',path:'/keys',scope:'session:owner',summary:'Issue an immutable scoped key',handle:async c=>keys(c.env,c.actor,c.p)},
 {method:'GET',path:'/keys',scope:'session:owner',summary:'List keys without their secrets',handle:async c=>(await c.env.DB.prepare('SELECT k.id,k.label,k.expires_at AS expiresAt,k.revoked_at AS revokedAt,k.paused_at AS pausedAt,k.ledger_consent_at AS ledgerConsentAt,k.control_version AS controlVersion,k.monthly_model_budget_cents AS monthlyModelBudgetCents,r.scopes FROM p_rest_keys r JOIN p_agent_keys k ON k.id=r.key_id WHERE k.owner_id=?').bind(c.actor.id).all()).results},
 {method:'POST',path:'/keys/{id}/revoke',scope:'session:owner',summary:'Revoke a key',handle:async c=>{await commit(c.env.DB,c.actor,[c.env.DB.prepare('UPDATE p_agent_keys SET revoked_at=? WHERE id=? AND owner_id=? AND EXISTS(SELECT 1 FROM p_rest_keys WHERE key_id=?)').bind(Date.now(),c.id,c.actor.id,c.id)],true);await recordAudit(c.env.DB,c.actor,'api-key.revoke',c.id);return {revoked:true}}},
 {method:'GET',path:'/templates',scope:'templates.read',summary:'List available templates',handle:async c=>(await templateState(c.env.DB,c.actor)).map((t:any)=>({id:t.id,name:t.name,version:t.version}))},
 {method:'POST',path:'/proposals',scope:'proposals.write',summary:'Create a draft from a template; a person approves and sends',handle:async c=>{need(c.p.templateId!==undefined,'Choose a template');const result=await command(c.env,c.actor,'proposal.prepare',c.p);await recordAudit(c.env.DB,c.actor,'api.proposal.prepare',result.id);return result}},
 {method:'POST',path:'/proposals/{id}/variables',scope:'proposals.write',summary:'Fill draft template variables in a new revision',handle:async c=>{const result=await fillVariables(c.env,c.actor,c.id,c.p);await recordAudit(c.env.DB,c.actor,'api.proposal.variables',c.id);return result}},
 {method:'GET',path:'/proposals',scope:'proposals.read',summary:'Read proposal status',handle:async c=>proposals(c.env,c.actor)},
 {method:'GET',path:'/analytics',scope:'analytics.read',summary:'Read counts by proposal status',handle:async c=>analytics(c.env,c.actor)},
 {method:'GET',path:'/payments',scope:'payments.read',summary:'Read recorded payment status',handle:async c=>(await c.env.DB.prepare('SELECT id,proposal_id AS proposalId,cents AS amountCents,currency,method,received_on AS receivedOn FROM p_payment_records ORDER BY id').all()).results},
 {method:'GET',path:'/agreements',scope:'agreements.read',summary:'List retained agreements',handle:async c=>(await c.env.DB.prepare('SELECT proposal_id AS id,revision,total_cents AS totalCents,currency,accepted_at AS acceptedAt FROM p_acceptances ORDER BY accepted_at,proposal_id').all()).results},
 {method:'POST',path:'/webhooks',scope:'session:owner',summary:'Authorize a destination and receive its signing secret once',handle:async c=>webhookCreate(c.env,c.actor,c.p)},
 {method:'GET',path:'/webhooks',scope:'session:owner',summary:'List webhook connection state',handle:async c=>webhookState(c.env)},
 {method:'POST',path:'/webhooks/{id}/revoke',scope:'session:owner',summary:'Revoke webhook delivery',handle:async c=>webhookRevoke(c.env,c.actor,c.id)},
 {method:'GET',path:'/deliveries',scope:'session:owner',summary:'Read delivery attempts and HTTP outcomes',handle:async c=>(await c.env.DB.prepare('SELECT d.id,d.webhook_id AS webhookId,d.event_id AS eventId,e.type,d.attempts,d.status,d.http_status AS httpStatus,d.next_at AS nextAt FROM p_webhook_deliveries d JOIN p_webhook_events e ON e.id=d.event_id ORDER BY e.occurred_at,d.id').all()).results},
]
const requests:Record<string,unknown>={
 '/keys':{type:'object',required:['label','scopes'],properties:{label:{type:'string',maxLength:80},scopes:{type:'array',minItems:1,uniqueItems:true,items:{type:'string',enum:scopes}}}},
 '/proposals':{type:'object',required:['templateId','templateVersion','clientId'],properties:{templateId:{type:'string'},templateVersion:{type:'integer'},clientId:{type:'string'},title:{type:'string'}}},
 '/proposals/{id}/variables':{type:'object',required:['version','values'],properties:{version:{type:'integer'},values:{type:'object',additionalProperties:{type:'string'}}}},
 '/webhooks':{type:'object',required:['url','consent'],properties:{url:{type:'string',format:'uri'},consent:{const:true}}},
}
export function description(){const paths:Record<string,any>={};for(const r of routes){const path=prefix+r.path;paths[path]??={};paths[path][r.method.toLowerCase()]={summary:r.summary,...(r.method==='POST'?{requestBody:{required:true,content:{'application/json':{schema:requests[r.path]??{type:'object'}}}}}:{}),'x-scope':r.scope,security:r.scope==='public'?[]:[r.scope==='session:owner'?{ownerSession:[]}:{scopedKey:[]}],...(r.path.includes('{id}')?{parameters:[{in:'path',name:'id',required:true,schema:{type:'string'}}]}:{}),responses:{'200':{description:'Successful response'},'400':{description:'Invalid input'},'401':{description:'Authentication required'},'403':{description:'Insufficient authority'}}}}
 return {openapi:'3.1.0',info:{title:'Platter API',version:'1'},paths,components:{securitySchemes:{scopedKey:{type:'http',scheme:'bearer','x-scopes':scopes},ownerSession:{type:'apiKey',in:'cookie',name:'oa_session'}},schemas:{LifecycleEvent:eventSchema}},'x-webhook-events':Object.fromEntries(eventTypes.map(type=>[type,{schema:{$ref:'#/components/schemas/LifecycleEvent'},example:eventExample(type)}]))}}
function reference(){return document('API reference','<section><p>Issue keys as the signed-in owner. Keys expire after 30 days, keep their original scopes and can only draft or read. A person approves, sends, signs and refunds.</p><p>The owner can pause or resume each key and explicitly authorize digest receipts in Settings. Paused keys cannot read or draft. Receipt inspection is owner-only in Agent access; raw bodies and credentials are not retained, and unverified model identity is shown as not recorded.</p><p><a href="'+prefix+'/openapi.json">OpenAPI description</a></p>'+routes.map(r=>'<article data-route="'+r.method+' '+prefix+r.path+'"><h2>'+escape(r.summary)+'</h2><p><code>'+r.method+' '+escape(prefix+r.path)+'</code></p><p>Scope: <code>'+escape(r.scope)+'</code></p></article>').join('')+'<h2>Draft from a template</h2><p>Use an Authorization header with Bearer followed by your key. Read templates, then POST proposals with templateId, templateVersion and clientId. Fill text tokens such as {{Client.Company}} by posting the current version and a values object to the draft variables route. Missing values refuse a human send with HTTP 409. Filling creates a new draft revision and clears prior approval. The original sent revision stays frozen.</p><h2>Lifecycle webhooks</h2><p>Authorize an HTTPS destination with consent=true. Keep its one-time secret privately. Verify HMAC-SHA256 over the timestamp, a period and the exact body bytes against platter-signature (v1=hex). Reject timestamps older than five minutes and deduplicate platter-event-id. Delivery is at least once. Failed requests retry with exponential delays starting at one minute, up to eight attempts; redirects are refused. Delivery logs retain attempt count and HTTP status, never receiver bodies. Restored destinations require fresh authorization.</p>'+eventTypes.map(type=>'<article><h3>'+escape(type)+'</h3><pre>'+escape(JSON.stringify(eventExample(type),null,2))+'</pre></article>').join('')+'</section>',{styles:'pre,code{white-space:pre-wrap;overflow-wrap:anywhere}article{min-width:0}'} )}
export async function publicApi(request:Request,env:Bindings,sources?:AgentSource[]):Promise<Response|null>{
 const url=new URL(request.url);if(url.pathname!==prefix&&!url.pathname.startsWith(prefix+'/'))return null
 try{
  need(url.origin===env.AUTH_ORIGIN&&(!request.headers.has('host')||request.headers.get('host')===url.host),'Wrong application origin',403)
  let id='';const route=routes.find(r=>{if(r.method!==request.method)return false;const parts=r.path.split('{id}');if(parts.length===1)return url.pathname===prefix+r.path;const start=prefix+parts[0],end=parts[1];if(!url.pathname.startsWith(start)||!url.pathname.endsWith(end))return false;const value=url.pathname.slice(start.length,end?-end.length:undefined);if(!value||value.includes('/'))return false;id=decodeURIComponent(value);return true})
  need(route,'Public API route not found',404)
  let actor={} as Actor
  if(route.scope!=='public'){
   if(route.scope==='session:owner'){
    actor=await principal(request,env);need(actor.role==='owner','Only the owner manages public API access',403)
    if(request.method==='POST')need(request.headers.get('origin')===env.AUTH_ORIGIN&&request.headers.get('sec-fetch-site')!=='cross-site','Authorize from this installation',403)
   }else{
    const token=request.headers.get('authorization')?.match(/^Bearer (\S+)$/)?.[1];need(token&&token.length<200,'Scoped API key required',401)
    const key=await env.DB.prepare(`SELECT r.scopes FROM p_rest_keys r JOIN p_agent_keys k ON k.id=r.key_id WHERE k.token_hash=?`).bind(await hash(token)).first<{scopes:string}>();need(key,'Scoped API key required',401)
    actor=await principal(request,env,true,true);need(JSON.parse(key.scopes).includes(route.scope),'API key lacks scope '+route.scope,403)
   }
  }
  actor.agentSources=sources
  let p:Record<string,unknown>={}
  if(request.method==='POST'){need(request.headers.get('content-type')?.includes('application/json'),'Use JSON',415);const raw=await request.text();need(new TextEncoder().encode(raw).length<=150000,'Request too large',413);try{p=JSON.parse(raw)}catch{need(false,'Invalid JSON')};need(p&&typeof p==='object'&&!Array.isArray(p),'Expected an object')}
  if(route.path==='/reference')return reference()
  const value=await route.handle({env,actor,p,id})
  const kind=({'/proposals':'proposal','/templates':'template','/payments':'payment','/agreements':'agreement','/analytics':'analytics'} as Record<string,string>)[route.path]
  if(request.method==='GET'&&kind){
   if(kind==='analytics')await citeAgentSource(actor,kind,'proposal-status',null,value)
   else for(const row of value as any[])await citeAgentSource(actor,kind,row.id,row.revision??row.version,row)
  }
  return json(value)
 }catch(error){const status=Number((error as any)?.status)||500;return json({error:status<500?(error as Error).message:'The API request could not be completed'},status)}
}
