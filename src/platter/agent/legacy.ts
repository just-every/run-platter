import type { Bindings } from '../../auth.server'
import { proposalTools } from './tools'
import { localAgent, platterAgentDoor } from './index'

/** Existing HTTP preparation clients enter the same policy, audit and replay
 * pipeline as MCP. This is a transport adapter, never a second dispatcher. */
export async function legacyAgentResponse(request:Request,env:Bindings):Promise<Response|null> {
 const path=new URL(request.url).pathname
 if(!['/api/platter/agent/context','/api/platter/agent/command'].includes(path))return null
 const json=(body:unknown,status=200)=>Response.json(body,{status,headers:{'cache-control':'no-store'}})
 if(request.headers.has('origin')&&request.headers.get('origin')!==env.AUTH_ORIGIN)return json({code:'origin_refused'},403)
 let who
 try { who=await localAgent(request,env,true) } catch { return json({code:'insufficient_scope'},403) }
 if(!who)return json({code:'unauthenticated'},401)
 let name='platter.workspace.snapshot',args:Record<string,any>={}
 if(path.endsWith('/command')) {
  if(request.method!=='POST')return json({code:'method_not_allowed'},405)
  const input=await request.json() as any
  const names:Record<string,string>={'proposal.prepare':'platter.proposals.prepare','proposal.revise':'platter.proposals.revise'}
  name=names[input.name]
  if(!name)return json({code:'forbidden'},403)
  args={...input.input}
  if(input.name==='proposal.prepare'&&args.templateId)name='platter.templates.start'
  if(args.depositPercent!==undefined)args.depositPercent=Number(args.depositPercent)
  const schema=proposalTools(env).find(t=>t.name===name)!.inputSchema.properties??{}
  if(Object.keys(args).some(k=>!Object.hasOwn(schema,k)&&!['idempotency_key','expected_revision'].includes(k)))return json({code:'forbidden'},403)
  args.idempotency_key=request.headers.get('idempotency-key')??args.idempotency_key
 } else if(request.method!=='GET')return json({code:'method_not_allowed'},405)
 const result=await (await platterAgentDoor(env)).invoke(name,args,{...who,person:who.sponsor})
 if(result.outcome==='done')return json(path.endsWith('/context')?{...(result.result as object),proposals:((result.result as any).proposals??[]).map((p:any)=>({...p,mailReplies:[]})),reminderTemplates:[],outbox:[],connections:[]}:result.result)
 return json({code:result.code??'approval_required',...result.fields,...(result.approval?{approval:result.approval}:{})},result.outcome==='pending'?202:result.code==='unauthenticated'?401:403)
}
