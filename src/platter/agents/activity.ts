import type { Bindings } from '../../auth.server'
import { hash, need, type Actor } from '../model'
import { starterTemplates } from '../starter-templates'
import { handleMcp } from '../mcp'

// External callers do not establish a model identity or a trustworthy price.
// Retain digests and opaque record references, never arbitrary request bodies.
function references(value:any){
 const refs:string[]=[]
 for(const key of ['id','clientId','templateId'])if(typeof value?.[key]==='string')refs.push(key+':'+value[key])
 for(const key of ['proposals','clients','templates','items'])if(Array.isArray(value?.[key]))for(const row of value[key])if(typeof row?.id==='string')refs.push(key+':'+row.id)
 return refs
}
async function recordActivity(env:Bindings,a:Actor,action:string,input:any,output:any){
 const inputRefs:string[]=[]
 for(const [field,table] of [['id','p_proposals'],['clientId','p_clients'],['templateId','p_personal_templates']]){
  const id=input?.[field]
  if(typeof id==='string'&&(await env.DB.prepare('SELECT id FROM '+table+' WHERE id=?').bind(id).first()||field==='templateId'&&starterTemplates().some(t=>t.id===id)))inputRefs.push(field+':'+id)
 }
 let proposal:any=null
 for(const subject of [output?.id,input?.id])if(!proposal&&typeof subject==='string')proposal=await env.DB.prepare('SELECT id,revision FROM p_proposals WHERE id=?').bind(subject).first<any>()
 const revision=Number.isSafeInteger(output?.revision)?output.revision:Number.isSafeInteger(input?.revision)?input.revision:proposal?.revision??null
 await env.DB.prepare('INSERT INTO p_agent_activity(id,key_id,action,input_hash,output_hash,input_refs,output_refs,proposal_id,revision,model,occurred_at) VALUES(?,?,?,?,?,?,?,?,?,NULL,?)').bind(crypto.randomUUID(),a.keyId!,action,await hash(JSON.stringify(input??null)),await hash(JSON.stringify(output??null)),JSON.stringify(inputRefs),JSON.stringify(references(output)),proposal?.id??null,revision,Date.now()).run()
}
export async function agentAction<T>(env:Bindings,a:Actor,action:string,input:unknown,run:()=>Promise<T>):Promise<T>{
 if(a.role!=='agent'||!a.keyId)return run()
 const key=await env.DB.prepare('SELECT paused_at FROM p_agent_keys WHERE id=? AND revoked_at IS NULL AND expires_at>?').bind(a.keyId,Date.now()).first<any>()
 need(key,'Agent credential expired or revoked',401);need(!key.paused_at,'Agent is paused',423)
 const output=await run()
 await recordActivity(env,a,action,input,output)
 return output
}
export async function agentLedger(env:Bindings,a:Actor,url:URL){
 need(a.role==='owner','Only the owner reads agent activity',403)
 const key=url.searchParams.get('key');need(!key||key.length<=200,'Invalid key identifier')
 const rows=(await env.DB.prepare('SELECT * FROM p_agent_activity'+(key?' WHERE key_id=?':'')+' ORDER BY occurred_at,id').bind(...(key?[key]:[])).all<any>()).results
 return {rows:await Promise.all(rows.map(async row=>({...row,input_refs:JSON.parse(row.input_refs),output_refs:JSON.parse(row.output_refs),approvals:row.proposal_id?(await env.DB.prepare('SELECT actor_id,approved_at FROM p_approvals WHERE proposal_id=? AND revision=? ORDER BY approved_at,id').bind(row.proposal_id,row.revision).all()).results:[]})))}
}
export async function agentMcp(request:Request,env:Bindings,a:Actor){
 // The protocol handler remains the authority for transport and tool errors.
 let message:any;try{message=await request.clone().json()}catch{return handleMcp(request,env,a)}
 if(message?.method!=='tools/call')return handleMcp(request,env,a)
 const response=await handleMcp(request,env,a)
 if(response.status!==200)return response
 let rpc:any;try{rpc=await response.clone().json()}catch{return response}
 if(rpc.error||rpc.result?.isError)return response
 const output=JSON.parse(rpc.result.content[0].text)
 // Work already completed inside the protocol handler; pausing affects the
 // next request, never discards the receipt for an in-flight successful tool.
 await recordActivity(env,a,'mcp.'+message.params.name,message.params?.arguments??{},output)
 return response
}
